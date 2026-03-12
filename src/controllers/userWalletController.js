const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const UserProfile = require("../models/userProfile");
const Withdrawal = require("../models/withdrawalModel");
const User = require("../models/users");
const Transaction = require("../models/transactionModel");
const convertToMongoId = require("../utils/convertToMongoId");
const { emptyList } = require("../constants");

// Add funds
const addFundsUser = asyncHandler(async (request, response) => {
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
const verifyAddFundsUser = asyncHandler(async (request, response) => {
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

// Fetch wallet analytics
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

// Fetch user purchases
const fetchUserPurchases = asyncHandler(async (request, response) => {
    // Get user profile ID
    const { userProfileId } = request.user.profiles;

    // Query options
    const { page = 1, limit = 10 } = request.query;

    // Base filter
    const baseFilter = { ownerId:userProfileId, ownerModel:"UserProfile", type:"buy" };

    // Pagination options
    const options = {
        page: Number(page),
        limit: Number(limit),
        select:"orderId createdAt status amount -_id",
        lean: true,
        sort: { createdAt: -1 }
    };

    // Fetch
    const transactions = await Transaction.paginate(baseFilter, options);
    if(!transactions.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No purchases found for users profile"));

    // Response
    return response.status(200).json(new ApiResponse(200, transactions, "Purchases for users have been fetched"));
});

module.exports = { addFundsUser, verifyAddFundsUser, fetchUserWalletAnalytics, fetchUserPurchases };