const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const Stripe = require("stripe");
const UserProfile = require("../models/userProfile");
const Transaction = require("../models/transactionModel");
const convertToMongoId = require("../utils/convertToMongoId");
const { emptyList } = require("../constants");
const sendNotification = require("../utils/sendNotification");
const { addFundsUserValidator } = require("../validations/walletValidator");
const validate = require("../utils/validate");

// Add funds
const addFundsUser = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { userProfileId } = request.user.profiles || {};

    // Get validated payload
    const { funds } = validate(addFundsUserValidator, request.body) || {};

    // Find wallet
    const wallet = await Wallet.findOne({ ownerId:userProfileId, ownerModel:"UserProfile" }).select("_id").lean();
    if(!wallet) return response.status(200).json(new ApiResponse(200, null, "Wallet account not found! Please setup your payout account first"));

    // Initialize stripe SDK
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        client_reference_id: String(userId), // Tie session to logged in user
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
        metadata: { 
            userProfileId: String(userProfileId),
            userId: String(userId)
        },
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
        // Get metadata
        const { userProfileId, userId } = session.metadata;
        if(!userProfileId) throw new ApiError(400, "User profile ID is missing in stripe metadata");

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
            const [transaction] = await Transaction.create([{
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
            
            // Send notification
            await sendNotification({
                userId: String(userId),
                title: "Funds Added",
                content: `${Number(amountPaid)} funds added to your wallet account`,
                type: "UserProfile",
                io: request.app.get("io")
            });            

            // Response
            return response.status(303).redirect(`${process.env.FRONTEND_URL}/wallet/user`);
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
    const { page = 1, limit = 10, type } = request.query;

    // Validate type
    if(type && type !== "refund") throw new ApiError(400, "Invalid type! Type key must be of 'refund'");

    // Set valid type
    const validType = type === "refund" ? "refund" : "buy";

    // Base filter
    const baseFilter = { ownerId:userProfileId, ownerModel:"UserProfile", type:validType };

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

    // Response message
    let responseMessage = "Purchases for users have been fetched";
    if(type === "refund") responseMessage = "Refunds for users have been fetched";

    // Response
    return response.status(200).json(new ApiResponse(200, transactions, responseMessage));
});

// Fetch spending activity
const fetchUserSpendingActivity = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles;

    // Current date
    const now = new Date();

    // Calculate start of week (Monday)
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;

    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() + diff);
    startOfWeek.setHours(0,0,0,0);

    // End of week (Sunday)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23,59,59,999);

    // Aggregate weekly spending
    const weeklySpending = await Transaction.aggregate([
        // Match
        {
            $match:{
                ownerId: convertToMongoId(userProfileId),
                ownerModel:"UserProfile",
                type:"buy",
                status:"completed",
                createdAt:{ $gte:startOfWeek, $lte:endOfWeek }
            }
        },

        // Group by weekday
        {
            $group:{
                _id:{ $dayOfWeek:"$createdAt" },
                spending:{ $sum:"$amount" }
            }
        }
    ]);

    // Aggregate totals
    const totals = await Transaction.aggregate([
        // Match
        {
            $match:{
                ownerId: convertToMongoId(userProfileId),
                ownerModel:"UserProfile",
                status:"completed"
            }
        },

        // Group
        {
            $group:{
                _id:null,
                totalSpend:{
                    $sum:{
                        $cond:[{ $eq:["$type","buy"] }, "$amount", 0]
                    }
                },
                totalRefund:{
                    $sum:{
                        $cond:[{ $eq:["$type","refund"] }, "$amount", 0]
                    }
                }
            }
        }
    ]);

    // Prepare weekly graph payload
    const weekMap = { 
        2:"monday", 3:"tuesday", 4:"wednesday", 5:"thursday",
        6:"friday", 7:"saturday", 1:"sunday"
    };

    // Grapgh
    const graph = {
        monday:0, tuesday:0, wednesday:0, thursday:0,
        friday:0, saturday:0, sunday:0
    };

    // Weekly spending
    weeklySpending.forEach(item => {
        const day = weekMap[item._id];
        if(day) graph[day] = item.spending;
    });

    // Prepare totals payload
    const payload = {
        graph,
        totalSpend: totals[0]?.totalSpend || 0,
        totalRefund: totals[0]?.totalRefund || 0
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "User spending activity has been fetched"));
});

module.exports = { addFundsUser, verifyAddFundsUser, fetchUserWalletAnalytics, 
fetchUserPurchases, fetchUserSpendingActivity };