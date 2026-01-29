const BusinessProfile = require("../models/businessProfileSchema");
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
    const business = await BusinessProfile.findOne({ ownerUserId:userId });

    // 3 Stripe SDK initialize ki Stripe secret key se
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // 4 Check karo kya business ke paas pehle se Stripe Connect account hai
    let stripeAccountId = business.stripeConnectId;

    // 5 Agar Stripe account pehle se NAHI hai to naya bana do
    if (!stripeAccountId) {

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
        account: stripeAccountId, // kis Stripe account ke liye onboarding

        // Agar user onboarding beech me chhor de to yahan wapas aayega
        refresh_url:`${process.env.BACKEND_URL}/api/v1/wallet/retry`,

        // Onboarding complete hone ke baad yahan redirect hoga
        return_url:`${process.env.BACKEND_URL}/api/v1/wallet/success`,

        type:'account_onboarding', // onboarding flow start karna hai
    });

    // 7 Frontend ko onboarding URL bhej diya
    // Frontend is link pe seller ko redirect karega
    return response.status(200).json(new ApiResponse(200, accountLink.url, "Onboarding link generated"));
});

// Withdraw funds from wallet to stripe account
//ismay pehlay ham check kr rhay hai kay seller kay pass balance hai kay nhi agar nhi hai to ham bataday gay 
//ham check kr rhay hai kay seller kay stripe connect id hai kay nhi agar nhi hai to error ayega agar dono condition true hhai to ham transfer karega
const WithdrawFunds = asyncHandler(async (request, response) => {
    const { _id } = request.user; 

    const business = await BusinessProfile.findOne({ ownerUserId: _id });
    if (!business) throw new ApiError(404, 'Business id not found!')
    const wallet = await Wallet.findOne({ businessId: business._id });

    if (!wallet || wallet.availableBalance <= 0) {
        throw new ApiError(400, "You don't have enough available balance to withdraw");
    }

    if (!business.stripeConnectId) { 
        return response.status(200).json(new ApiResponse(200, { onboardingRequired: true }, "Please setup your payout account first"));
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Store the amount being withdrawn
    const withdrawalAmount = wallet.availableBalance;

    // First create Stripe transfer (external API, doesn't use MongoDB session)
    const transfer = await stripe.transfers.create({
        amount: Math.round(withdrawalAmount * 100),  
        currency: 'usd',
        destination: business.stripeConnectId,
        description: `Withdrawal for business: ${business.companyName}`
    });

    // If Stripe transfer succeeds, update wallet using MongoDB transaction
    const dbSession = await mongoose.startSession();
    dbSession.startTransaction();
    try 
    {
        // Deduct the withdrawn amount from wallet and update totalEarned
        wallet.availableBalance = 0;
        wallet.totalEarned = (wallet.totalEarned || 0) + withdrawalAmount;
        await wallet.save({ session: dbSession });

        await dbSession.commitTransaction();
        dbSession.endSession();
        return response.status(200).json(new ApiResponse(200, transfer, "Funds transferred to your bank account successfully"));
    } 
    catch(error) 
    {
        await dbSession.abortTransaction();
        dbSession.endSession();
        throw error;
    }
}); 

module.exports = {connectSellerAccountStripe , WithdrawFunds}
