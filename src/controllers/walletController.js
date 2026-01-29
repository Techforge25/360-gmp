const BusinessProfile = require("../models/businessProfileSchema");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const mongoose = require("mongoose");
const Stripe = require("stripe");

// Connect seller Stripe account (onboarding)
const connectSellerAccountStripe = asyncHandler(async (request, response) => {
    // 1 Logged-in user ka ID nikaala
    const userId = request.user._id;

    // 2 Us user ka business profile dhoonda
    // Kyun? Kyunki Stripe account business ke naam se banega
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("stripeConnectId");
    if(!business) throw new ApiError(404, "Business profile not found");

    // 3 Stripe SDK initialize ki Stripe secret key se
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 4 Check karo kya business ke paas pehle se Stripe Connect account hai
    let stripeAccountId = business.stripeConnectId;

    // 5 Agar Stripe account pehle se NAHI hai to naya bana do
    if(!stripeAccountId) 
    {
        // Stripe pe ek Express type connected account create kiya
        // Express accounts = sellers ke liye best (Stripe onboarding handle karta hai)
        const account = await stripe.accounts.create({ type: 'express' });

        // Stripe ne jo account ID di woh save kar li
        stripeAccountId = account.id;

        // Apne database me bhi store kar li taake future me reuse ho
        business.stripeConnectId = stripeAccountId;
        await business.save();
    }

    // 6 Ab onboarding link generate karte hain
    // Yeh link seller ko bhejna hota hai taake wo Stripe form fill kare
    const accountLink = await stripe.accountLinks.create({
        account:stripeAccountId, // kis Stripe account ke liye onboarding

        // Agar user onboarding beech me chhor de to yahan wapas aayega
        refresh_url:`${process.env.BACKEND_URL}/api/v1/wallet/retry`,

        // Onboarding complete hone ke baad yahan redirect hoga
        return_url:`${process.env.BACKEND_URL}/api/v1/wallet/success`,

        type:'account_onboarding' // onboarding flow start karna hai
    });

    // 7 Frontend ko onboarding URL bhej diya
    // Frontend is link pe seller ko redirect karega
    return response.status(200).json(new ApiResponse(200, accountLink.url, "Onboarding link generated"));
});

// Withdraw funds from wallet to stripe account
// ismay pehlay ham check kr rhay hai kay seller kay pass balance hai kay nhi agar nhi hai to ham bataday gay 
// ham check kr rhay hai kay seller kay stripe connect id hai kay nhi agar nhi hai to error ayega agar dono condition true hhai to ham transfer karega
const WithdrawFunds = asyncHandler(async (request, response) => {
    const userId = request.user._id; 

    // Find business
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id stripeConnectId companyName").lean();
    if(!business) throw new ApiError(404, 'Business profile not found!');

    // If stripe connect account does not exist
    if(!business.stripeConnectId) return response.status(200).json(new ApiResponse(200, { onboardingRequired:true }, "Please setup your payout account first"));
    
    // Find wallet
    const wallet = await Wallet.findOne({ businessId:business._id });
    if(!wallet || wallet.availableBalance <= 0) throw new ApiError(400, "You don't have enough available balance to withdraw");

    // Initialize stripe SDK
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Check payout verification
    const account = await stripe.accounts.retrieve(business.stripeConnectId);
    if(!account.payouts_enabled) throw new ApiError(400, "Your payout account is not verified yet");

    // Store withdwaral amount
    const withdrawalAmount = wallet.availableBalance;

    // Start db session for safe transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();

    try 
    {
        // Update wallet
        const updatedWallet = await Wallet.findOneAndUpdate(
            { businessId:business._id, availableBalance:{ $gt:0 } },
            { $inc:{ totalEarned:withdrawalAmount }, $set:{ availableBalance:0 } },
            { new:true, session:dbSession }
        );
        if(!updatedWallet) throw new ApiError(400, "Balance already withdrawn");

        // Commit changes
        await dbSession.commitTransaction();
        dbSession.endSession();

        // Transfer
        const transfer = await stripe.transfers.create({
            amount: Math.round(Number(withdrawalAmount) * 100),
            currency: 'usd',
            destination: business.stripeConnectId,
            description: `Withdrawal for business: ${business.companyName}`,
        });
        if(!transfer) throw new ApiError(500, "Failed to transfer amount");

        // Response
        return response.status(200).json(new ApiResponse(200, transfer, "Funds sent to your Stripe account successfully"));
    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
}); 

// Fetch wallet analytics
const fetchWalletAnalytics = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Business find
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id");
    if(!business) throw new ApiError(404, "Business profile not found");

    // Wallet
    const wallet = await Wallet.findOne({ businessId:business._id });

    // Escrow aggregation
    const escrowStats = await EscrowTransaction.aggregate([
        { $match: { sellerId:business._id } },
        {
            $group: {
                _id: null,

                // Total sales (excluding refunded)
                totalSalesVolume: {
                    $sum: {
                        $cond: [
                            { $ne: ["$status", "refunded"] },
                            "$totalAmount",
                            0
                        ]
                    }
                },

                // Platform fees (excluding refunded)
                totalPlatformFees: {
                    $sum: {
                        $cond: [
                            { $ne: ["$status", "refunded"] },
                            "$platformFee",
                            0
                        ]
                    }
                },

                // Net earnings (only released to seller)
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

    // Stats
    const stats = escrowStats[0] || {
        totalSalesVolume: 0,
        totalPlatformFees: 0,
        netEarnings: 0
    };

    // Payload
    const payload = {
        availableBalance: wallet?.availableBalance || 0,
        pendingBalance: wallet?.pendingBalance || 0,
        totalSalesVolume: stats.totalSalesVolume,
        totalPlatformFees: stats.totalPlatformFees,
        netEarnings: stats.netEarnings        
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Wallet analytics fetched successfully"));
});

module.exports = { connectSellerAccountStripe , WithdrawFunds, fetchWalletAnalytics };
