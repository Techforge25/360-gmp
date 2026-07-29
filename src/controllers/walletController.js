const BusinessProfile = require("../models/businessProfileSchema");
const Wallet = require("../models/walletModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const { isValidObjectId } = require("mongoose");
const Stripe = require("stripe");
const validate = require("../utils/validate");
const withdrawFundsValidationSchema = require("../validations/withdrawFundValidator");
const UserProfile = require("../models/userProfile");
const Withdrawal = require("../models/withdrawalModel");
const User = require("../models/users");
const Order = require("../models/orders");
const convertToMongoId = require("../utils/convertToMongoId");
const sendNotification = require("../utils/sendNotification");

// Connect Stripe account (onboarding)
const connectStripeAccount = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const role = request.user.role;

    // Get parent user's email for stripe dashboard
    const user = await User.findById(userId).select("email").lean();
    if(!user) throw new ApiError(404, "User not found");

    // Get owner model
    const { ownerModel } = request.body; // "BusinessProfile" | "UserProfile"
    if(!ownerModel) throw new ApiError(400, "Owner model is missing");
    if(!["BusinessProfile", "UserProfile"].includes(ownerModel)) throw new ApiError(400, "Invalid owner model");

    // Initialize stripe SDK
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    let owner;
    let stripeAccountId;

    // Business profile
    if(ownerModel === "BusinessProfile") 
    {
        owner = await BusinessProfile.findOne({ ownerUserId:userId }).select("stripeConnectId");
        if(!owner) throw new ApiError(404, "Business profile not found");
        stripeAccountId = owner.stripeConnectId;      
    }

    // User profile
    if(ownerModel === "UserProfile") 
    {
        owner = await UserProfile.findOne({ userId });
        if(!owner) throw new ApiError(404, "User profile not found");
        stripeAccountId = owner.stripeConnectId;
    }

    // If Stripe account does not exist, then create
    if(!stripeAccountId) 
    {
        const account = await stripe.accounts.create({
            type: "express",
            email: user.email, // helpful for Stripe dashboard
            metadata: { platformUserId:userId.toString(), ownerModel }
        });

        stripeAccountId = account.id;

        // Save Stripe account ID in respective model
        owner.stripeConnectId = stripeAccountId;
        await owner.save();
    }

    // Create onboarding link
    const accountLink = await stripe.accountLinks.create({
        account: stripeAccountId,
        refresh_url: `${process.env.FRONTEND_URL}/stripe/onboarding/refresh`,
        return_url: `${process.env.FRONTEND_URL}/dashboard/${role}/wallet/?isConnected=${true}`,
        type: "account_onboarding"
    });

    // Response
    return response.status(200).json(new ApiResponse(200, { url: accountLink.url }, "Stripe onboarding link generated"));
});

// Connect stripe account success
const connectStripeAccountSuccess = asyncHandler(async (request, response) => {
    const { _id:userId, role } = request.user;

    // Validate
    if(!userId) throw new ApiError(400, "User ID missing");
    if(!role) throw new ApiError(400, "Role is missing");
    if(!["business", "user"].includes(role)) throw new ApiError(400, "Invalid role");

    // Decide notification type
    const type = role === "business" ? "BusinessProfile" : "UserProfile";

    // Send notification
    await sendNotification({
        userId,
        title: "Wallet Connected",
        content: "Your wallet account has been connected to platform's Stripe",
        type,
        io: request.app.get("io")
    });

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Stripe account connected successfully")); 
});

// Withdraw funds from wallet to stripe account
const WithdrawFunds = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { ownerModel, withdrawalAmount } = validate(withdrawFundsValidationSchema, request.body);

    // Type safety
    const amount = Number(withdrawalAmount);

    // Find owner profile
    let owner;
    if(ownerModel === "BusinessProfile") 
    {
        owner = await BusinessProfile.findOne({ ownerUserId: userId }).select("_id stripeConnectId companyName").lean();
    } 
    else if(ownerModel === "UserProfile")
    {
        owner = await UserProfile.findOne({ userId }).select("_id stripeConnectId fullName").lean();
    }
    else
    {
        throw new ApiError(400, "Invalid owner model");
    }

    if(!owner) throw new ApiError(404, `${ownerModel} not found`);
    if(!owner.stripeConnectId) return response.status(200).json(new ApiResponse(200, { onboardingRequired:true }, "Setup payout account first"));

    // Get wallet
    const wallet = await Wallet.findOne({ ownerId:owner._id, ownerModel });
    if(!wallet) throw new ApiError(404, "Wallet not found");
    if(amount > wallet.availableBalance) throw new ApiError(400, "Insufficient available balance");

    // Initialize stripe SDK
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Check payout account verification
    const account = await stripe.accounts.retrieve(owner.stripeConnectId);
    if(!account.payouts_enabled) return response.status(200).json(new ApiResponse(200, { onboardingRequired:true }, "Your payout account is not verified yet"));

    // Start db session
    const session = await mongoose.startSession();
    session.startTransaction();

    let withdrawalDoc;

    try 
    {
        // Deduct balance safely (atomic)
        const updatedWallet = await Wallet.findOneAndUpdate(
            { ownerId:owner._id, ownerModel, availableBalance:{ $gte:amount } },
            { $inc:{ availableBalance: -amount } },
            { new:true, session }
        );
        if(!updatedWallet) throw new ApiError(400, "Balance already used in another withdrawal");

        // Create withdrawal record
        [withdrawalDoc] = await Withdrawal.create([{
            ownerId: owner._id,
            ownerModel,
            amount,
            currency: wallet.currency,
            status: "pending"
        }], { session });

        // Commit transaction
        await session.commitTransaction();
        session.endSession();
    } 
    catch (error) 
    {
        await session.abortTransaction();
        session.endSession();
        throw error;
    }

    // Stripe transfer AFTER DB lock
    try 
    {
        const transfer = await stripe.transfers.create({
            amount: Math.round(amount * 100),
            currency: wallet.currency,
            destination: owner.stripeConnectId,
            description: `Wallet withdrawal`,
            metadata: { withdrawalId: String(withdrawalDoc._id) }
        });

        // Mark success
        await Withdrawal.findByIdAndUpdate(withdrawalDoc._id, { stripeTransferId:transfer.id, status:"completed" });

        // Send notification
        await sendNotification({ 
            userId,
            title: "Withdrawal", 
            content: `You have withdrawn amount of ${amount}`, 
            type: ownerModel,
            io: request.app.get("io") 
        });        

        // Response
        return response.status(200).json(new ApiResponse(200, { transferId: transfer.id }, "Funds sent successfully"));
    } 
    catch(stripeError) 
    {
        // Refund wallet if Stripe fails
        await Wallet.findOneAndUpdate(
            { ownerId: owner._id, ownerModel },
            { $inc: { availableBalance: amount } }
        );

        // Mark status failed
        await Withdrawal.findByIdAndUpdate(withdrawalDoc._id, { status:"failed" });
        throw new ApiError(500, "Transfer failed. Amount refunded to wallet.");
    }
});

// View transaction detials
const viewTransactionTimeline = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid Order ID");
    
    // Fetch transaction timeline
    const [timeline] = await Order.aggregate([
        // Match order
        { $match: { _id: convertToMongoId(orderId) } },

        // Lookup inside escrow transaction
        {
            $lookup: {
                from: "escrowtransactions",
                localField: "_id",
                foreignField: "orderId",
                as: "escrow"
            }
        },

        // Lookup inside escrow transaction (For extracting transaction status)
        {
            $lookup: {
                from: "transactions",
                localField: "_id",
                foreignField: "orderId",
                as: "transaction"
            }
        },        

        // Lookup inside user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "buyerUserProfileId",
                foreignField: "_id",
                as: "userProfile"
            }
        },    
        
        // Lookup inside business profile
        {
            $lookup:{
                from: "businessprofiles",
                localField: "sellerBusinessId",
                foreignField: "_id",
                as: "businessProfile"
            }
        },          

        // Unwind
        { $unwind:{ path:"$escrow", preserveNullAndEmptyArrays:true } },
        { $unwind:{ path:"$transaction", preserveNullAndEmptyArrays:true } },
        { $unwind:{ path:"$userProfile", preserveNullAndEmptyArrays:true } },
        { $unwind:{ path:"$businessProfile", preserveNullAndEmptyArrays:true } },

        // Projection
        {
            $project:{ 
                status: "$transaction.status",
                orderPlacedAt: "$createdAt", 
                shippedAt: "$tracking.shippedAt", 
                deliveredAt: "$tracking.deliveredAt",
                completedAt: "$completedAt",
                cancelledAt: "$cancellation.cancelledAt",
                grossSaleAmount: "$escrow.totalAmount",
                platformFee: "$escrow.platformFee",
                netAmount: "$escrow.netAmount",
                shippingAddress:{ lineAddresses:"$shippingAddress.lineAddress" },
                buyerDetails: { name: "$userProfile.fullName", email: "$userProfile.email" },
                sellerDetails: { name: "$businessProfile.companyName", supportEmail: "$businessProfile.primaryContactPerson.supportEmail" },
                paymentMethod: "$escrow.paymentMethod",
            }
        }
    ]);

    // Validate
    if(!timeline) throw new ApiError(404, "Order not found");

    // Response
    return response.status(200).json(new ApiResponse(200, timeline, "Transaction timeline has been fetched"));
});

module.exports = { connectStripeAccount, connectStripeAccountSuccess, WithdrawFunds, viewTransactionTimeline };