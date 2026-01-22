const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createSubscriptionStripe, verifyStripePayment, getMySubscription } = require("../controllers/subscription");

// Router instance
const subscriptionRouter = Router();

// Stripe
subscriptionRouter.route("/stripe/create").post(authentication, createSubscriptionStripe);
subscriptionRouter.route("/stripe/success").get(verifyStripePayment);

// Get my subscription
subscriptionRouter.route("/").get(authentication, getMySubscription);

module.exports = subscriptionRouter;