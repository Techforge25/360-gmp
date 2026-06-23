const Plan = require("../models/plan");
const Subscription = require("../models/subscription");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const Stripe = require("stripe");
const convertToMongoId = require("../utils/convertToMongoId");
const sendNotification = require("../utils/sendNotification");
const SubscriptionHistory = require("../models/subscriptionHistoryModel");
const { emptyList } = require("../constants");
const mongoose = require("mongoose");
const User = require("../models/users");

// Helper function to get 
const getSubscriptionDates = (startingDate) => {
    const startDate = new Date(Number(startingDate) * 1000);
    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    
    return { startDate, endDate };
};

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

    // Prevent duplicate active subscription and downgrade subscription
    // const existingSubscription = await Subscription.findOne({ userId, planId, status:"active", endDate:{ $gt:new Date() } });
    const existingSubscription = await Subscription.findOne({ userId });
    if(existingSubscription && name === "TRIAL")
    {
        throw new ApiError(400, "You cannot downgrade your subscription plan");
    }
    if(String(existingSubscription?.planId) === String(planId) 
    && existingSubscription?.status === "active" && new Date(existingSubscription?.endDate) > new Date())
    {
        return response.status(200).json(new ApiResponse(200, null, "You already have an active subscription for this plan"));
    }

    // Stripe instance
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_SUBSCRIPTION);

    // Common session config
    let sessionConfig = {
        payment_method_types: ["card"],
        mode: "subscription", // For subscription based (Auto deduction)
        line_items: [{ price: stripePriceId, quantity: 1 }],
        metadata: { 
            userId: String(userId), 
            planId: String(planId), 
            planName: name 
        },
        success_url: `${process.env.BACKEND_URL}/api/v1/subscription/stripe/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BACKEND_URL}/api/v1/subscription/stripe/cancel`
    };

    // If trial plan selected → apply 14 days trial
    if(name === "Sneak Peek Free – 14 Days") sessionConfig.subscription_data = { trial_period_days: 14 }; // Auto charge after 14 days

    // Create checkout session
    const session = await stripe.checkout.sessions.create(sessionConfig);
    if(!session) throw new ApiError(400, "Stripe session creation failed");

    // Response
    return response.status(200).json(new ApiResponse(200, session.url, "Checkout url generated"));
});

// Verify stripe subscription payment
const verifyStripePayment = asyncHandler(async (request, response) => {
    // Get session for payment verification
    const { session_id } = request.query;
    if(!session_id) throw new ApiError(400, "Session ID is missing");   

    // Redirect to frontend
    // const redirectUrl = `http://localhost:3000/onboarding/user-profile`;
    const redirectUrl = `http://localhost:3000/subscription/success?session_id=${session_id}`;
    return response.status(303).redirect(redirectUrl);
});

// Delete subscription (Cancel via app)
const cancelStripeSubscription = asyncHandler(async (request, response) => {
    const { _id:userId, subscription } = request.user;
    const { password } = request.body || {};
    console.log("Password: ", password);
    if(!password) throw new ApiError(400, "Password is required to cancel subscription");

    // Find user
    const user = await User.findById(userId).select("passwordHash");
    if(!user) throw new ApiError(404, "User not found");

    // Match password
    const isMatched = await user.matchPassword(password);
    if(!isMatched) throw new ApiError(400, "Incorrect password!");

    // Initialized stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_SUBSCRIPTION);

    // Cancel subscription
    const deleteSubscription = await stripe.subscriptions.cancel(subscription.stripeSubscriptionId); 
    if(!deleteSubscription) throw new ApiError(500, "Failed to cancel subscription");

    /* Subscription status will be marked as canceled in db (via webhook) */

    // Prepare payload
    const payload = { 
        subscriptionId: subscription.stripeSubscriptionId, 
        subscriptionStatus: "canceled"
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Subscription has been cancelled"));
});

// Stripe webhook (Handle recurring subscription lifecycle)
const stripeWebhook = asyncHandler(async (request, response) => {
    console.log("Webhook fired");

    // Initialize stripe SDK
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_SUBSCRIPTION);

    // Get webhook signature
    const signature = request.headers["stripe-signature"];
    console.log("Signature received", signature);

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
        console.log("checkout.session.completed");
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

        // Get dates for db
        const { startDate, endDate } = getSubscriptionDates(stripeSubscription.start_date);

        // Start mongoose transaction
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();   
        
        try
        {
            // Check if already exists
            let subscription = await Subscription.findOne({ userId }).session(dbSession);        

            if(subscription)
            {
                console.log("Subscription plan upgraded");

                // Save to db
                subscription.stripeSubscriptionId = stripeSubscriptionId;
                subscription.planId = planId;
                subscription.startDate = startDate;
                subscription.endDate = endDate;
                subscription.status = "active";
                await subscription.save({ session: dbSession });

                // Save to subscription history
                await SubscriptionHistory.create([{ 
                    userId, 
                    planId, 
                    invoiceId:subscription.stripeSubscriptionId, 
                    status: "paid" 
                }], { session: dbSession });

                // Get plan name for notification context
                const plan = await Plan.findById(planId).select("name").lean();

                // Notification
                await sendNotification({
                    userId,
                    title: "Subscription Updated",
                    content: `You have successfully re-subscribed to ${plan.name}` 
                    ? `Your subscription has been renewed successfully to the ${plan.name}`
                    : `Your subscription has been updated successfully`,
                    type: "System",
                    io: request.app.get("io")
                });    
                
                // Commit transaction
                await dbSession.commitTransaction();
                dbSession.endSession();                
            }
            else
            {
                console.log("First time subscription creation");

                // Created 1st time
                await Subscription.create([{
                    userId,
                    stripeSubscriptionId,
                    planId,
                    startDate: startDate,
                    endDate: endDate,
                    status: "active"
                }], { session: dbSession }); 
                
                // Save to subscription history
                await SubscriptionHistory.create([{ 
                    userId,
                    planId,
                    invoiceId:stripeSubscriptionId,
                    status: "paid"
                }], { session: dbSession });

                // Get plan name for notification context
                const plan = await Plan.findById(planId).select("name").lean();                  

                // Notification
                await sendNotification({
                    userId,
                    title: "Subscription Activated",
                    content: `You have successfully subscribed to ${plan.name}`,
                    type: "System",
                    io: request.app.get("io")
                });  

                // Commit transaction
                await dbSession.commitTransaction();
                dbSession.endSession();                              
            }
        }
        catch(error) 
        {
            await dbSession.abortTransaction();
            dbSession.endSession();
            throw error;
        }
    }

    // Recurring Payment Success
    if(eventType === "invoice.payment_succeeded")
    {
        console.log("invoice.payment_succeeded");

        // Get invoice event object
        const invoice = event.data.object;
        const stripeSubscriptionId = invoice.subscription;
        if(!stripeSubscriptionId) return response.status(200).json({ received:true });

        // Start mongoose transaction
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try
        {
            // Find subscription
            const subscription = await Subscription.findOne({ stripeSubscriptionId }).session(dbSession);
            if(subscription)
            {
                const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

                // Get date for db
                const { startDate, endDate } = getSubscriptionDates(stripeSubscription.start_date);

                // Save to db
                subscription.startDate = startDate;
                subscription.endDate = endDate;
                subscription.status = "active";
                await subscription.save({ session: dbSession });

                // Save to subscription history
                await SubscriptionHistory.create([{ 
                    userId: subscription.userId, 
                    planId: subscription.planId, 
                    invoiceId:subscription.stripeSubscriptionId, 
                    status: "paid" 
                }], { session: dbSession });

                // Notification
                await sendNotification({
                    userId: subscription.userId,
                    title: "Subscription Renewed",
                    content: "Your subscription has been renewed successfully",
                    type:"System",
                    io: request.app.get("io")
                });  
                
                // Commit transaction
                await dbSession.commitTransaction();
                dbSession.endSession();                
            }
        }
        catch(error)
        {
            await dbSession.abortTransaction();
            throw error;
        }
    }

    // Payment Failed
    if(eventType === "invoice.payment_failed")
    {
        console.log("invoice.payment_failed");

        // Get invoice event object
        const invoice = event.data.object;
        const stripeSubscriptionId = invoice.subscription;
        if(!stripeSubscriptionId) return response.status(200).json({ received:true });

        // Start mongoose transaction
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try 
        {
            // Find subscription
            const subscription = await Subscription.findOne({ stripeSubscriptionId }).session(dbSession);
            if(subscription)
            {
                // Save to db
                subscription.status = "expired";
                await subscription.save({ session: dbSession });
                
                // Save to subscription history
                await SubscriptionHistory.create([{ 
                    userId: subscription.userId, 
                    planId: subscription.planId, 
                    invoiceId:subscription.stripeSubscriptionId, 
                    status: "failed" 
                }], { session: dbSession });

                // Notification
                await sendNotification({
                    userId: subscription.userId,
                    title: "Subscription Payment Failed",
                    content: "Your subscription payment has failed. Please update your payment method.",
                    type:"System",
                    io: request.app.get("io")
                });            
            }

            // Commit transaction
            await dbSession.commitTransaction();
            dbSession.endSession();             
        } 
        catch(error) 
        {
            await dbSession.abortTransaction();
            dbSession.endSession();  
            throw error;
        }
    }

    // Subscription Cancelled
    if(eventType === "customer.subscription.deleted")
    {
        console.log("customer.subscription.deleted");

        // Get customer event object
        const stripeSubscription = event.data.object;

        // Start mongoose transaction
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try
        {
            // Find subscription
            const subscription = await Subscription.findOne({ stripeSubscriptionId: stripeSubscription.id }).session(dbSession);
            if(subscription)
            {
                // Save to db
                subscription.status = "canceled";
                await subscription.save({ session: dbSession });

                // Save to subscription history
                await SubscriptionHistory.create([{ 
                    userId: subscription.userId, 
                    planId: subscription.planId, 
                    invoiceId: subscription.stripeSubscriptionId, 
                    status: "deleted" 
                }], { session: dbSession });

                // Notification
                await sendNotification({
                    userId: subscription.userId,
                    title: "Subscription Canceled",
                    content: "Your subscription has been canceled",
                    type:"System",
                    io: request.app.get("io")
                });              
            }

            // Commit transaction
            await dbSession.commitTransaction();
            dbSession.endSession();              
        }
        catch(error)
        {
            await dbSession.abortTransaction();
            dbSession.endSession();
            throw error;
        }
    }

    // Response
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
        { $project:{ plan:"$plan.name", description:"$plan.description", status:1, price:"$plan.price", startDate:1, endDate:1 } }
    ]);

    if(!subscription.length) throw new ApiError(404, "Subscription not found");

    // Response
    return response.status(200).json(new ApiResponse(200, subscription[0], "Subscription details has been fetched"));
});

// Check subscription existense of user
const checkSubscriptionExistense = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Check if user had ever purchased a subscription
    const subscription = await Subscription.findOne({ userId })
    .populate({ path:"planId", select:"name price" })
    .select("_id endDate status");
    if(!subscription)
    {
        const exist = await SubscriptionHistory.exists({ userId });
        const hasPurchasedBefore = exist ? true : false;
        return response.status(200).json(new ApiResponse(200, { subscriptionStatus: false, hasPurchasedBefore }, "No active subscription found"));
    }

    // Prepare payload
    const payload = {
        subscriptionStatus: subscription.status,
        planName: subscription.planId?.name || "Plan name not specified",
        price: subscription.planId?.price || 0
    };

    // Response
    return response.status(200)
    .json(new ApiResponse(200, payload, "Active subscription found"));
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

// Get all my subscriptions
const getAllMySubscriptions = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);

    // Pagination options
    const { page = 1, limit = 10, status } = request.query;

    // Base filter
    const baseFilter = { userId };
    if(status)
    {
        if(!["paid", "failed"].includes(status)) throw new ApiError(400, "Invalid status filter! Allowed values are paid, failed");
        baseFilter.status = status;
    }

    // Subscription details
    const aggregation = SubscriptionHistory.aggregate([
        // Match
        { $match: baseFilter },

        // Lookup
        {
            $lookup: {
                from: "plans",
                localField: "planId",
                foreignField: "_id",
                as: "plan" 
            }
        },

        // Unwind
        { $unwind: "$plan" },

        // Projection
        { $project: { createdAt:1, invoiceId:1, status:1, planName: "$plan.name", amount: "$plan.price" } },

        // Sort by most recent
        { $sort: { createdAt: -1 } }
    ]);

    // Execute query
    const subscriptions = await SubscriptionHistory.aggregatePaginate(aggregation, { page, limit });
    if(!subscriptions.docs.length) return response.status(200).json(new ApiResponse(200, emptyList, "No subscription history found"));

    // Response
    return response.status(200).json(new ApiResponse(200, subscriptions, "All subscriptions fetched"));
});

module.exports = { createSubscriptionStripe, verifyStripePayment, stripeWebhook, checkSubscriptionExistense,
getMySubscription, totalSpent, checkSubscriptionStatus, getAllMySubscriptions, cancelStripeSubscription };