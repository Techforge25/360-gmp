const BusinessProfile = require("../models/businessProfileSchema");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const validate = require("../utils/validate");
const withdrawFundsValidationSchema = require("../validations/withdrawFundValidator");
const UserProfile = require("../models/userProfile");
const Withdrawal = require("../models/withdrawalModel");
const User = require("../models/users");
const Transaction = require("../models/transactionModel");
const convertToMongoId = require("../utils/convertToMongoId");

// Connect Stripe account (onboarding)
const connectStripeAccount = asyncHandler(async (request, response) => {
    const userId = request.user._id;

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
        owner = await BusinessProfile.findOne({ ownerUserId:userId });
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
        return_url: `${process.env.FRONTEND_URL}/stripe/onboarding/success`,
        type: "account_onboarding"
    });

    // Response
    return response.status(200).json(new ApiResponse(200, { url: accountLink.url }, "Stripe onboarding link generated"));
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
    // const account = await stripe.accounts.retrieve(owner.stripeConnectId);
    // if(!account.payouts_enabled) throw new ApiError(400, "Your payout account is not verified yet");

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
        if (!updatedWallet) throw new ApiError(400, "Balance already used in another withdrawal");

        // Create withdrawal record
        withdrawalDoc = await Withdrawal.create([{
            ownerId:owner._id,
            ownerModel,
            amount,
            currency: wallet.currency,
            status: "pending"
        }], { session });

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
            currency: wallet.currency.toLowerCase(),
            destination: owner.stripeConnectId,
            description: `Wallet withdrawal`,
            metadata: { withdrawalId: withdrawalDoc[0]._id.toString() }
        });

        // Mark success
        await Withdrawal.findByIdAndUpdate(withdrawalDoc[0]._id, { stripeTransferId:transfer.id, status:"completed" });

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
        await Withdrawal.findByIdAndUpdate(withdrawalDoc[0]._id, { status:"failed" });
        throw new ApiError(500, "Transfer failed. Amount refunded to wallet.");
    }
});

// Add funds (Only user can add funds)
const addFunds = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const funds = Number(request.body?.funds) || 0;

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Validate funds
    if(!funds) throw new ApiError(400, "Please add some funds");
    if(typeof funds !== "number") throw new ApiError(400, "Funds must be of number type");
    if(funds <= 0) throw new ApiError(400, "Funds must be greater than zero");

    // Find wallet
    const wallet = await Wallet.findOne({ ownerId:userProfile._id, ownerModel:"UserProfile" }).select("_id").lean();
    if(!wallet) return response.status(200).json(new ApiResponse(200, null, "Wallet account not found! Please setup your payout account first"));

    // Initialize stripe SDK
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        client_reference_id:userId.toString(), // Tie session to logged in user
        line_items: [{
            price_data: {
                currency: "usd",
                unit_amount: Math.round(Number(funds) * 100),
                product_data: {
                    name: `Add funds`,
                    metadata: {
                        brand: "360-GMP",
                        category: "Funds transfer"
                    }
                },
            },
            quantity: 1,
        }],
        metadata: { userProfileId:userProfile._id.toString() },
        success_url: `${process.env.BACKEND_URL}/api/v1/wallet/user/add-funds/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BACKEND_URL}/api/v1/wallet/user/add-funds/cancel`
    });

    // Validate
    if(!session) throw new ApiError(400, "Stripe session creation failed");

    // Response
    return response.status(200).json(new ApiResponse(200, session.url, "Checkout url generated"));
});

// Verify add funds
const verifyAddFunds = asyncHandler(async (request, response) => {
    const { session_id } = request.query;
    if (!session_id) throw new ApiError(400, "Session ID is missing");

    // Initialize stripe SDK
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Get checkout session details
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Validate session
    if (!session || !session.id) throw new ApiError(404, "Session not found");

    // Check session belongs to logged in user
    // if(session.client_reference_id !== request.user._id.toString()) throw new ApiError(403, "This session does not belong to the logged in user");

    // Prevent dual payment processing
    const existing = await Transaction.findOne({ stripeSessionId:session.id });
    if(existing) return response.status(200).json(new ApiResponse(200, null, "Payment already processed"));

    // Check payment status
    if(session.payment_status === "paid") 
    {
        // Redirect url
        const redirectUrl = `${process.env.FRONTEND_URL}`;

        // Get metadata
        const { userProfileId } = session.metadata;
        if (!userProfileId) throw new ApiError(400, "User profile ID is missing in stripe metadata");

        // Extract amount from stripe session
        const amountPaid = session.amount_total / 100;

        // (Optional) Expire old sessions (10 min safety)
        // const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        // if(session.created * 1000 < tenMinutesAgo) throw new ApiError(400, "Session expired");
        
        // Find profile
        const userProfile = await UserProfile.findById(userProfileId).select("_id").lean();
        if(!userProfile) throw new ApiError(400, "User profile not found");

        // Start db session
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try 
        {
            // Credit wallet balance
            const wallet = await Wallet.findOneAndUpdate(
                { ownerId:userProfileId, ownerModel:"UserProfile" },
                { $inc: { availableBalance: Number(amountPaid) } },
                { new:true, session:dbSession }
            );
            if(!wallet) throw new ApiError(404, "Wallet not found");

            // Save transaction log
            const transaction = await Transaction.create([{
                ownerId: userProfileId,
                ownerModel: "UserProfile",
                type: "deposit",
                amount: Number(amountPaid),
                stripeSessionId: session.id,
                status: "completed",
                paymentMethod:"stripe"
            }], { session: dbSession });
            if (!transaction) throw new ApiError(500, "Failed to create transaction entry");

            // Commit changes
            await dbSession.commitTransaction();
            dbSession.endSession();

            // Response
            return response.status(303).redirect(redirectUrl);
        }
        catch (error) 
        {
            await dbSession.abortTransaction();
            dbSession.endSession();
            throw error;
        }
    }
    else 
    {
        throw new ApiError(400, "Payment not completed");
    }
});

// Fetch wallet analytics for business
const fetchBusinessWalletAnalytics = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find Business
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id").lean();
    if(!business) throw new ApiError(404, "Business profile not found");

    // Wallet
    const wallet = await Wallet.findOne({ ownerId:business._id, ownerModel:"BusinessProfile" }).lean();
    if(!wallet) throw new ApiError(400, "Wallet account not found");

    // Escrow Stats
    const [escrowStats] = await EscrowTransaction.aggregate([
        { $match: { sellerId:business._id } },
        {
            $group: {
                _id: null,

                // Total sales volume
                totalSalesVolume: {
                    $sum: {
                        $cond: [
                            { $ne: ["$status", "refunded"] },
                            "$totalAmount",
                            0
                        ]
                    }
                },

                // Total platform fee
                totalPlatformFees: {
                    $sum: {
                        $cond: [
                            { $ne: ["$status", "refunded"] },
                            "$platformFee",
                            0
                        ]
                    }
                },

                // Net earnings
                netEarnings: {
                    $sum: {
                        $cond: [
                            { $eq: ["$status", "released"] },
                            "$netAmount",
                            0
                        ]
                    }
                }
            }
        }
    ]);

    // Safe defaults
    const stats = escrowStats || { totalSalesVolume:0, totalPlatformFees:0, netEarnings:0 };

    // Final payload
    const payload = {
        availableBalance: wallet?.availableBalance ?? 0,
        pendingBalance: wallet?.pendingBalance ?? 0,
        totalSalesVolume: stats.totalSalesVolume,
        totalPlatformFees: stats.totalPlatformFees,
        netEarnings: stats.netEarnings
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Wallet analytics for business fetched successfully"));
});

// Fetch wallet analytics for business
const fetchUserWalletAnalytics = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Get user profile id
    const userProfileId = convertToMongoId(userProfile._id);

    // Get wallet balance
    const wallet = await Wallet.findOne({ ownerId:userProfileId, ownerModel:"UserProfile" }).select("availableBalance").lean();
    if(!wallet) return response.status(200).json(new ApiResponse(200, null, "You need to setup your wallet account"));

    // Get pending escrow amount (buyer side)
    const escrowStats = await EscrowTransaction.aggregate([
        {
            $match: { buyerId:userProfileId, status:"held" }
        },
        {
            $group: {
                _id: null,
                totalPendingEscrow: { $sum:"$totalAmount" }
            }
        }
    ]);

    // Compute stats
    const availableBalance = wallet?.availableBalance || 0;
    const totalPendingEscrow = escrowStats[0]?.totalPendingEscrow || 0;

    // Prepare payload
    const payload = { availableBalance, totalPendingEscrow }

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "User wallet analytics have been fetched"))
});

module.exports = { connectStripeAccount , WithdrawFunds, addFunds, verifyAddFunds,
fetchBusinessWalletAnalytics, fetchUserWalletAnalytics };
