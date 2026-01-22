const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createSubscriptionStripe, verifyStripePayment, getMySubscription, totalSpent } = require("../controllers/subscription");

// Router instance
const subscriptionRouter = Router();

// Stripe
subscriptionRouter.route("/stripe/create").post(authentication, createSubscriptionStripe);
subscriptionRouter.route("/stripe/success").get(verifyStripePayment);

// Get my subscription
subscriptionRouter.route("/").get(authentication, getMySubscription);

// Total spent on subscriptions till now
subscriptionRouter.route("/total-spent").get(authentication, totalSpent);

module.exports = subscriptionRouter;