const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createSubscriptionStripe, verifyStripePayment, stripeWebhook, getMySubscription, 
totalSpent, checkSubscriptionStatus, getAllMySubscriptions, checkSubscriptionExistense, 
cancelStripeSubscription } = require("../controllers/subscription");
const { checkSubscription } = require("../middlewares/checkSubscription");

// Router instance
const subscriptionRouter = Router();

// Stripe
subscriptionRouter.route("/stripe/create").post(authentication, createSubscriptionStripe);
subscriptionRouter.route("/stripe/success").get(verifyStripePayment);
subscriptionRouter.route("/stripe/cancel").get((request, response) => {
    return response.status(303).redirect(`${process.env.FRONTEND_URL}/onboarding/plans`);
});

// Delete subscription (Cancel via app)
subscriptionRouter.route("/stripe/cancel-subscription")
.delete(authentication, checkSubscription, cancelStripeSubscription);

// Stripe webhook for subscription
subscriptionRouter.route("/webhook").post(stripeWebhook);

// Get my current subscription
subscriptionRouter.route("/").get(authentication, getMySubscription);

// Check subscription existense of user
subscriptionRouter.route("/exists").get(authentication, checkSubscriptionExistense);

// Get my current subscription
subscriptionRouter.route("/all").get(authentication, getAllMySubscriptions);

// Total spent on subscriptions till now
subscriptionRouter.route("/total-spent").get(authentication, totalSpent);

// Check subscription status for a plan
subscriptionRouter.route("/status/:planId").get(authentication, checkSubscriptionStatus);

module.exports = subscriptionRouter;