# STRIPE SUBSCRIPTION BASED FLOW

### This involves

- Monthly auto deduction

- Trial with card collection

- Auto charge after 14 days

- Prevent duplicate session processing

- Stripe customer stored

- Subscription period synced from Stripe

## Routes
```javascript
// Router instance
const subscriptionRouter = Router();

// Stripe
subscriptionRouter.route("/stripe/create").post(authentication, createSubscriptionStripe);
subscriptionRouter.route("/stripe/success").get(verifyStripePayment);
subscriptionRouter.route("/stripe/cancel").get((request, response) => {
    return response.status(303).redirect(`${process.env.FRONTEND_URL}/onboarding/plans`);
});
```

---

## Controllers
```javascript
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
```