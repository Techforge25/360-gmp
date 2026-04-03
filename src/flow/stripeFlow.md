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

---

## Webhook

- Now, I will implement webhook for secure payment and auto deduction with db tracking.

### Step 01: Get Developer Access

- Get dev access on stripe account from client

- Login to stripe dashboard

- Enable test mode. (Click toggle on top right corner)

### Step 02: Product & Recurring Price Creation

- Go to dashboard → Products → Add Product

- Product Name: `Silver Plan`

- Pricing:

- Select Recurring

- Billing period: Monthly

- Amount: e.g. $10

- Save

- After saving, you will get `Stripe Price ID` that looks like `price_1Pxxxxxxx`

- Copy it and paste into your plan collection's field, named as `stripePriceId`

### Step 03: Add Webhook

- Go to Dashboard → Developers → Webhooks → Click → Add Endpoint

#### Endpoint
```bash
https://gmp-backend.techforgeinnovations.com/api/v1/subscription/webhook
```

- Select these 4 events:

✅ **checkout.session.completed**

✅ **invoice.payment_succeeded**

✅ **invoice.payment_failed**

✅ **customer.subscription.deleted**

- Save

### Step 04: Webhook Secret

- Copy webhook secret that looks like `whsec_xxxxxxxxx`

- Store in your .env file

`.env`
```javascript
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxx
```

### Step 05: Webhook Functionality

```javascript
// Stripe webhook
subscriptionRouter.route("/webhook")
.post(express.raw({ type: "application/json" }), stripeWebhook);
```

- `express.json()` won't work. You need to use `express.raw({ type: "application/json" })`

```javascript
// Stripe webhook controller (Handle recurring subscription lifecycle)
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

    // Checkout session completed
    if(eventType === "checkout.session.completed") console.log("Checkout session completed");

    // Monthly recurring payment success
    if(eventType === "invoice.payment_succeeded")
    {
        // Get subscription ID
        const invoice = event.data.object;
        const stripeSubscriptionId = invoice.subscription;
        if(!stripeSubscriptionId) return response.status(200).json({ received:true });

        // Find subscription in DB
        const subscription = await Subscription.findOne({ stripeSubscriptionId });
        if(subscription)
        {
            // Get updated period from Stripe
            const stripeSubscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);

            // Save to db 
            subscription.startDate = new Date(stripeSubscription.current_period_start * 1000);
            subscription.endDate = new Date(stripeSubscription.current_period_end * 1000);
            subscription.status = "active";
            await subscription.save();

            console.log("Subscription renewed successfully");
        }
    }

    // Payment failed handling
    if(eventType === "invoice.payment_failed")
    {
        // Get subscription ID
        const invoice = event.data.object;
        const stripeSubscriptionId = invoice.subscription;
        if(!stripeSubscriptionId) return response.status(200).json({ received:true });

        // Find subscription in DB
        const subscription = await Subscription.findOne({ stripeSubscriptionId });
        if(subscription)
        {
            subscription.status = "expired";
            await subscription.save();

            console.log("Subscription payment failed");
        }
    }
    
    // Subscription canceled from Stripe
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

    // Return success response to Stripe
    return response.status(200).json({ received: true });
});
```

## CANCEL SUBSCRIPTION

- You can choose to cancel a subscription immediately or schedule it for the end of the billing period. 

#### Option A: Cancel Immediately 

- This method stops the subscription and billing right away.
```javascript
const stripe = require("stripe");

// Delete subscription (Cancel via app)
const cancelStripeSubscription = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find subscription
    const subscription = await Subscription.findOne({ userId })
    .select("status endDate stripeSubscriptionId");
    if(!subscription) throw new ApiError(400, "No subscription found");

    // Only active subscription can be cancelled
    if(subscription.status !== "active" || new Date(subscription.endDate) < new Date())
    {
        throw new ApiError(400, "Your subscription has already been expired");
    }

    // Initialized stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_SUBSCRIPTION);

    // Cancel subscription
    const deleteSubscription = await stripe.subscriptions.cancel(subscription.stripeSubscriptionId); 
    if(!deleteSubscription) throw new ApiError(500, "Failed to cancel subscription");

    // Save to db
    subscription.status = "canceled";
    await subscription.save();

    // Prepare payload
    const payload = { 
        subscriptionId: subscription.stripeSubscriptionId, 
        subscriptionStatus: subscription.status 
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Subscription has been deleted"));
});
```

#### Option B: Cancel at Period End

- This allows the customer to maintain access until the end of the current billing cycle.
```javascript
const stripe = require("stripe");

// Cancel stripe subscription at period
const cancelStripeSubscriptionAtPeriod = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find subscription
    const subscription = await Subscription.findOne({ userId })
    .select("status endDate stripeSubscriptionId");
    if(!subscription) throw new ApiError(400, "No subscription found");

    // Only active subscription can be cancelled
    if(subscription.status !== "active" || new Date(subscription.endDate) < new Date())
    {
        throw new ApiError(400, "Your subscription has already been expired");
    }

    // Initialized stripe
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY_SUBSCRIPTION);

    //  Cancel at period
    const cancelSubscription = await stripe.subscriptions.update(subscription.stripeSubscriptionId, {
        cancel_at_period_end: true,
    });
    if(!cancelSubscription) throw new ApiError(500, "Failed to cancel subscription");

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Subscription will be cancelled at period"));    
});
```