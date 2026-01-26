const Plan = require("../models/plan");
const Subscription = require("../models/subscription");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const getMonthlySubscriptionDates = require("../utils/getSubscriptionDates");
const Stripe = require("stripe");
const convertToMongoId = require("../utils/convertToMongoId");

// Create subscription via stripe
const createSubscriptionStripe = asyncHandler(async (request, response) => {
    const { _id, role } = request.user;
    const { planId } = request.query;
    if(!planId) throw new ApiError(400, "Plan ID is missing");

    // Get plan
    const plan = await Plan.findById(planId).lean();
    if(!plan) throw new ApiError(404, "Plan not found! Invalid plan ID");
    const { name, price } = plan;

    // If trial is selected
    // if(name === "TRIAL")
    // {
    //     // Calculate trial period
        // const startDate = new Date();
        // const endDate = new Date();
        // endDate.setDate(endDate.getDate() + 14);  

    //     // Create subscription for trial period
    //     const trialSubscription = await Subscription.create({ userId:_id, planId, status:"active", startDate, endDate });
    //     if(!trialSubscription) throw new ApiError(500, "Failed to create trial subscription");

    //     // Response for trial
    //     return response.status(200).json(new ApiResponse(200, "Trial period has been started successfully"));
    // }

    // Stripe instance
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Create session
    const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        mode: "payment",
        line_items: [{
            price_data: {
                currency: "usd",
                unit_amount: Number(price) * 100,
                product_data: { 
                    name: `${name} Plan`,
                    metadata:{
                        brand: "360-GMP",
                        category: "Monthly Subscription"
                    }
                },
            },
            quantity: 1,
        }],
        metadata: { _id, planId, planName:name, role },
        success_url: `${process.env.BACKEND_URL}/api/v1/subscription/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BACKEND_URL}/api/v1/subscription/stripe/cancel`
    });

    // Validate
    if(!session) throw new ApiError(400, "Stripe session creation failed");

    // Response
    return response.status(200).json(new ApiResponse(200, session.url, "Checkout url generated"));    
});

// Verify stripe payment
const verifyStripePayment = asyncHandler(async (request, response) => {
    const { session_id } = request.query;
    if(!session_id) throw new ApiError(400, "Session ID is missing");

    // Check subscription
    const checkSubscription = await Subscription
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Get checkout session details
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Validate session
    if(!session || !session.id) throw new ApiError(404, "Session not found");

    // Prevent dual payment for single session
    const existing = await Subscription.findOne({ stripeSubscriptionId:session.id });
    if(existing) return response.status(200).json(new ApiResponse(200, null, "Payment already processed"));    

    // Check payment status
    if(session.payment_status === "paid") 
    {
        // Get metadata
        const { _id, planId, planName, role } = session.metadata;
        
        // If trial selected
        if(planName === "TRIAL")
        {
            // Calculate for trial period
            const startDate = new Date();
            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 14);
            
            // Create trial period
            const trialSubscription = await Subscription.create({ 
                userId:_id, 
                planId, 
                status:"active", 
                startDate, 
                endDate,
                stripeSubscriptionId:session.id
            });
            if(!trialSubscription) throw new ApiError(500, "Failed to create trial period");

            // Response for trial
            return response.status(200).json(new ApiResponse(200, null, "Trial period has been started successfully"));
        }

        // Check existing subscription
        const existingSubscription = await Subscription.findOne({ userId:_id, planId, status:"active", endDate:{ $gt:new Date() }});

        // Existing subscription extend by 1 month
        if(existingSubscription) 
        {
            const { endDate } = getMonthlySubscriptionDates(existingSubscription.endDate);
            existingSubscription.endDate = endDate;
            await existingSubscription.save();
            return response.status(200).json(new ApiResponse(200, null, "Subscription extended by 1 month"));
        }        

        // Get subscription dates
        const { startDate, endDate } = getMonthlySubscriptionDates();        
        
        // Upgrade subscription
        const subscription = await Subscription.create({
            userId: _id,
            planId,
            status: "active",
            startDate,
            endDate,
            stripeSubscriptionId:session.id
        });

        // Redirect to url based on role
        const redirectUrl = role === "user" ? 
        `${process.env.FRONTEND_URL}/onboarding/user-profile` : 
        `${process.env.FRONTEND_URL}/onboarding/business-profile`

        if(!subscription) throw new ApiError(500, "Failed to save subscription details in db");
        return response.status(303).redirect(redirectUrl);
        // return response.status(200).json(new ApiResponse(200, null, "Payment verified & subscription activated"));
    } 
    else 
    {
        throw new ApiError(400, "Payment not completed");
    }
});

// Get my subscription
const getMySubscription = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);

    // Subscription details
    const subscription = await Subscription.aggregate([
        // Match
        { $match: { userId } },

        // Lookup
        {
            $lookup: {
                from: "plans",
                localField: "planId",
                foreignField: "_id",
                as: "plan"
            }
        },

        // Plan array to object
        { $unwind: "$plan" },

        // Exclude _id and other unnecessary fields
        { $project:{ _id:0, __v:0, "plan._id":0, "plan.__v":0, userId:0, planId:0 } }
    ]);

    // Response
    return response.status(200).json(new ApiResponse(200, subscription, "Subscription details has been fetched"));
});

// Total spent on subscriptions till now
const totalSpent = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);

    // Sum
    const result = await Subscription.aggregate([
        // Match
        { $match:{ userId } },

        // Lookup
        {
            $lookup: {
                from:"plans",
                localField:"planId",
                foreignField:"_id",
                as:"plan"
            }
        },

        // Plain array to object
        { $unwind: "$plan" },

        // Sum
        {
            $group:{ _id:null, totalSpent:{ $sum:"$plan.price" } }
        }
    ]);

    // Total spent
    const totalSpent = result[0]?.totalSpent || 0;

    // Response
    return response.status(200).json(new ApiResponse(200, totalSpent, "Total subscription amount calculated"));
});

module.exports = { createSubscriptionStripe, verifyStripePayment, getMySubscription, totalSpent };