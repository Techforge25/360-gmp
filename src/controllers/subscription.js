const Plan = require("../models/plan");
const Subscription = require("../models/subscription");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const getMonthlySubscriptionDates = require("../utils/getSubscriptionDates");
const Stripe = require("stripe");

// Create subscription via stripe
const createSubscriptionStripe = asyncHandler(async (request, response) => {
    const { _id } = request.user;
    const { planId } = request.query;
    if(!planId) throw new ApiError(400, "Plan ID is missing");

    // Get plan
    const plan = await Plan.findById(planId).lean();
    if(!plan) throw new ApiError(404, "Plan not found! Invalid plan ID");
    const { name, price } = plan;

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
        metadata: { _id, planId },
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
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Get checkout session details
    const session = await stripe.checkout.sessions.retrieve(session_id);

    // Validate session
    if(!session) throw new ApiError(404, "Session not found");

    // Check payment status
    if(session.payment_status === "paid") 
    {
        // Get metadata
        const { _id, planId } = session.metadata;

        // Check existing subscription
        const existingSubscription = await Subscription.findOne({ userId:_id, planId, status:"active", endDate:{ $gt:new Date() }});

        // Extend
        if(existingSubscription) 
        {
            const { endDate } = getMonthlySubscriptionDates(existingSubscription.endDate);
            existingSubscription.endDate = endDate;
            await existingSubscription.save();
            return response.status(200).json(new ApiResponse(200, null, "Subscription extended by 1 month"));
        }        

        // Get subscription dates
        const { startDate, endDate } = getMonthlySubscriptionDates();        
        
        // Save subscription
        const subscription = await Subscription.create({
            userId: _id,
            planId,
            status: "active",
            startDate,
            endDate
        });

        if(!subscription) throw new ApiError(500, "Failed to save subscription details in db");
        return response.status(200).json(new ApiResponse(200, null, "Payment verified & subscription activated"));
    } 
    else 
    {
        throw new ApiError(400, "Payment not completed");
    }
});

module.exports = { createSubscriptionStripe, verifyStripePayment };