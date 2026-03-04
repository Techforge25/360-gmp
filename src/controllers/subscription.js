const Plan = require("../models/plan");
const Subscription = require("../models/subscription");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Stripe = require("stripe");
const convertToMongoId = require("../utils/convertToMongoId");
const sendNotification = require("../utils/sendNotification");

// Create subscription via stripe (Recurring Monthly + Trial Support)
const createSubscriptionStripe = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { planId, profile } = request.query;

    // Validate
    if(!planId) throw new ApiError(400, "Plan ID is missing");
    if(!profile) throw new ApiError(400, "Profile model is missing! Please specify 'business' or 'user'");
    if(!["business", "user"].includes(profile)) throw new ApiError(400, "Invalid profile model! Please use 'business' or 'user'");

    // Check plan
    const plan = await Plan.findById(planId).lean();
    if(!plan) throw new ApiError(404, "Plan not found! Invalid plan ID");

    // Extract plan name and "Stripe Price ID"
    const { name, stripePriceId } = plan;
    if(!stripePriceId) throw new ApiError(400, "Stripe price ID not configured for this plan");
    if(name === "TRIAL" && profile === "business") throw new ApiError(400, "Business cannot select Trial plan");

    // Prevent duplicate active subscription
    const existingSubscription = await Subscription.findOne({ userId, planId, status:"active", endDate:{ $gt:new Date() } });
    if(existingSubscription) return response.status(200).json(new ApiResponse(200, null, "You already have an active subscription for this plan"));

    // Stripe instance
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Common session config
    let sessionConfig = {
        payment_method_types: ["card"],
        mode: "subscription", // For subscription based (Auto deduction)
        line_items: [{ price: stripePriceId, quantity: 1 }],
        metadata: { userId, planId, planName:name },
        success_url: `${process.env.BACKEND_URL}/api/v1/subscription/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BACKEND_URL}/api/v1/subscription/stripe/cancel`
    };

    // If trial plan selected → apply 14 days trial
    if(name === "TRIAL") sessionConfig.subscription_data = { trial_period_days: 14 }; // Auto charge after 14 days

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);
    if(!session) throw new ApiError(400, "Stripe session creation failed");

    // Response
    return response.status(200).json(new ApiResponse(200, session.url, "Checkout url generated"));
});

// Verify stripe subscription payment
const verifyStripePayment = asyncHandler(async (request, response) => {
    const { session_id } = request.query;
    if(!session_id) throw new ApiError(400, "Session ID is missing");

    // Initialize stripe SDK
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Retrieve checkout session
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if(!session || !session.id) throw new ApiError(404, "Session not found");

    // Prevent duplicate processing
    const existing = await Subscription.findOne({ stripeSubscriptionId: session.subscription });
    if(existing) return response.status(200).json(new ApiResponse(200, null, "Payment already processed"));

    // Check subscription mode
    if(session.mode !== "subscription") throw new ApiError(400, "Invalid session mode");

    // Get stripe subscription details
    const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);
    if(!stripeSubscription) throw new ApiError(404, "Stripe subscription not found");

    // Check subscription status
    if(!["active", "trialing"].includes(stripeSubscription.status)) throw new ApiError(400, "Subscription not active");

    // Extract metadata
    const { userId, planId, planName } = session.metadata;

    // Get subscription period dates from Stripe
    const startDate = new Date(stripeSubscription.current_period_start * 1000);
    const endDate = new Date(stripeSubscription.current_period_end * 1000);

    // Logs
    console.log("Session mode", session.mode);
    console.log("Subscription status", stripeSubscription.status);
    console.log("Start date", startDate);
    console.log("End date", endDate);
    console.log("Stripe subscription", stripeSubscription);

    // Create subscription record
    const subscription = await Subscription.create({
        userId,
        planId,
        status:"active",
        startDate,
        endDate,
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: stripeSubscription.customer
    });
    if(!subscription) throw new ApiError(400, "Failed to create subscription");

    // Send notification
    await sendNotification({
        userOwnerId:userId,
        title: "Subscription Activation",
        content: stripeSubscription.status === "trialing"
            ? `Your trial has started. You will be charged after 14 days`
            : `You have successfully subscribed to ${planName}`,
        io: request.app.get("io")
    });

    // Redirect to frontend
    const redirectUrl = `${process.env.FRONTEND_URL}/subscription/success?session_id=${session_id}`;
    return response.status(303).redirect(redirectUrl);
});

// Stripe webhook (Handle recurring subscription lifecycle)
const stripeWebhook = asyncHandler(async (request, response) => {

    // Initialize stripe SDK
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    // Get webhook signature
    const signature = request.headers["stripe-signature"];

    let event;

    // Verify webhook signature
    try 
    {
        event = stripe.webhooks.constructEvent(request.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
    } 
    catch (error) 
    {
        return response.status(400).send(`Webhook Error: ${error.message}`);
    }

    // Extract event type
    const eventType = event.type;

    // Checkout completed (New Subscription)
    if(eventType === "checkout.session.completed")
    {
        const session = event.data.object;

        // Only subscription checkout
        if(session.mode !== "subscription") return response.status(200).json({ received:true });

        // Get subscription id
        const stripeSubscriptionId = session.subscription;
        if(!stripeSubscriptionId) return response.status(200).json({ received:true });

        // Get subscription from stripe
        const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

        // Extract data from metadata
        const { userId, planId } = session.metadata;
        if(!userId) return response.status(200).json({ received:true });

        // Check if already exists
        let subscription = await Subscription.findOne({ userId });

        if(subscription)
        {
            // Get dates for db
            const startTimestamp = Number(
                stripeSubscription.current_period_start ||
                stripeSubscription.start_date ||
                stripeSubscription.billing_cycle_anchor
            );
            if(!startTimestamp)
            {
                console.log("Timestamp missing", stripeSubscription);
                return response.status(200).json({ received:true });
            }

            const startDate = new Date(startTimestamp * 1000);

            let endDate;
            if(stripeSubscription.current_period_end)
            {
                endDate = new Date(stripeSubscription.current_period_end * 1000);
            }
            else
            {
                // Monthly fallback (accurate)
                endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + 1);
            }        

            subscription.stripeSubscriptionId = stripeSubscriptionId;
            subscription.planId = planId;
            subscription.startDate = startDate;
            subscription.endDate = endDate;
            subscription.status = "active";

            // Save
            await subscription.save();
            console.log("Subscription updated after checkout");
        }
        else
        {
            // Get dates for db
            const startTimestamp = Number(
                stripeSubscription.current_period_start ||
                stripeSubscription.start_date ||
                stripeSubscription.billing_cycle_anchor
            );
            if(!startTimestamp)
            {
                console.log("Timestamp missing", stripeSubscription);
                return response.status(200).json({ received:true });
            }

            const startDate = new Date(startTimestamp * 1000);

            let endDate;
            if(stripeSubscription.current_period_end)
            {
                endDate = new Date(stripeSubscription.current_period_end * 1000);
            }
            else
            {
                // Monthly fallback (accurate)
                endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + 1);
            } 

            await Subscription.create({
                userId,
                stripeSubscriptionId,
                planId,
                startDate: startDate,
                endDate: endDate,
                status: "active"
            });
            console.log("Subscription created after checkout");
        }
    }

    // Recurring Payment Success
    if(eventType === "invoice.payment_succeeded")
    {
        const invoice = event.data.object;
        const stripeSubscriptionId = invoice.subscription;
        if(!stripeSubscriptionId) return response.status(200).json({ received:true });

        // Find subscription
        const subscription = await Subscription.findOne({ stripeSubscriptionId });
        if(subscription)
        {
            const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
            
            // Get dates for db
            const startTimestamp = Number(
                stripeSubscription.current_period_start ||
                stripeSubscription.start_date ||
                stripeSubscription.billing_cycle_anchor
            );
            if(!startTimestamp)
            {
                console.log("Timestamp missing", stripeSubscription);
                return response.status(200).json({ received:true });
            }

            const startDate = new Date(startTimestamp * 1000);

            let endDate;
            if(stripeSubscription.current_period_end)
            {
                endDate = new Date(stripeSubscription.current_period_end * 1000);
            }
            else
            {
                // Monthly fallback (accurate)
                endDate = new Date(startDate);
                endDate.setMonth(endDate.getMonth() + 1);
            } 

            // Set new dates
            subscription.startDate = startDate;
            subscription.endDate = endDate;
            subscription.status = "active";

            // Save
            await subscription.save();
            console.log("Subscription renewed successfully");
        }
    }

    // Payment Failed
    if(eventType === "invoice.payment_failed")
    {
        const invoice = event.data.object;
        const stripeSubscriptionId = invoice.subscription;
        if(!stripeSubscriptionId) return response.status(200).json({ received:true });

        // Find subscription
        const subscription = await Subscription.findOne({ stripeSubscriptionId });
        if(subscription)
        {
            subscription.status = "expired";
            await subscription.save();
            console.log("Subscription payment failed");
        }
    }

    // Subscription Cancelled
    if(eventType === "customer.subscription.deleted")
    {
        const stripeSubscription = event.data.object;
        const subscription = await Subscription.findOne({ stripeSubscriptionId: stripeSubscription.id });
        if(subscription)
        {
            subscription.status = "canceled";
            await subscription.save();
            console.log("Subscription canceled from Stripe");
        }
    }

    // Success response
    return response.status(200).json({ received:true });
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

// Check existing subscription and upgrade or downgrade
const checkSubscriptionStatus = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);
    const { planId } = request.params;

    // Check if user has an active subscription for the given plan
    const existingSubscription = await Subscription.findOne({ userId, status:"active", endDate:{ $gt:new Date() }});
    if(!existingSubscription)
    {
        return response.status(200).json(new ApiResponse(200, { shouldUpgrade:true }, "No active subscription found"));
    }
    
    // If user try to subscribe to the same plan
    if(String(existingSubscription.planId) === String(planId)) 
    {
        // Message
        const message = `You are already subscribed to this plan. Your current subscription is active until ${existingSubscription.endDate.toDateString()}. You can only subscribe to a different plan if you want to upgrade or downgrade.`;

        // Response
        return response.status(200).json(new ApiResponse(200, { isSamePlan:true }, message));
    }

    // If user try to updrade or downgrade
    if(String(existingSubscription.planId) !== String(planId)) 
    {
        // Message for upgrade or downgrade
        const message = `You already have an active subscription. If you choose a new plan, your current subscription access will end immediately, and access to the new plan will begin. The billing cycle for the new plan will start today, and next month's billing will follow the standard schedule. Unused days from your previous plan will not be carried over.`

        // Response
        return response.status(200).json(new ApiResponse(200, { canUpgrade:true }, message));
    }

    // Response
    return response.status(200).json(new ApiResponse(200, existingSubscription ? true : false, "Subscription status checked"));
});

module.exports = { createSubscriptionStripe, verifyStripePayment, stripeWebhook, 
getMySubscription, totalSpent, checkSubscriptionStatus };