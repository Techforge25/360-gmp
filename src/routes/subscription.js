const express = require("express");

const { authentication } = require("../middlewares/auth");
const { createSubscriptionStripe, verifyStripePayment, stripeWebhook, getMySubscription, 
totalSpent, checkSubscriptionStatus } = require("../controllers/subscription");

// Router instance
const subscriptionRouter = express.Router();

// Stripe
subscriptionRouter.route("/stripe/create").post(authentication, createSubscriptionStripe);
subscriptionRouter.route("/stripe/success").get(verifyStripePayment);
subscriptionRouter.route("/stripe/cancel").get((request, response) => {
    return response.status(303).redirect(`${process.env.FRONTEND_URL}/onboarding/plans`);
});
// Stripe webhook for subscription
subscriptionRouter.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);

// Get my subscription
subscriptionRouter.route("/").get(authentication, getMySubscription);

// Total spent on subscriptions till now
subscriptionRouter.route("/total-spent").get(authentication, totalSpent);

// Check subscription status for a plan
subscriptionRouter.route("/status/:planId").get(authentication, checkSubscriptionStatus);

module.exports = subscriptionRouter;