const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createSubscriptionStripe, verifyStripePayment } = require("../controllers/subscription");

// Router instance
const subscriptionRouter = Router();

// Stripe
subscriptionRouter.route("/stripe/create").post(authentication, createSubscriptionStripe);
subscriptionRouter.route("/stripe/success").get(verifyStripePayment);

module.exports = subscriptionRouter;