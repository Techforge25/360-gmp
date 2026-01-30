const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { connectStripeAccount, WithdrawFunds, fetchWalletAnalytics } = require("../controllers/walletController");

// Router instance
const walletRouter = Router();

// Connect Stripe account (onboarding)
walletRouter.route("/connect").post(authentication, connectStripeAccount);

// Withdraw funds from wallet to Stripe account
walletRouter.route("/withdraw").post(authentication, WithdrawFunds);

// For Stripe onboarding callback retry 
walletRouter.route("/retry")
.get((req, res) => res.json({ message: "Please try connecting again" }));

// For Stripe onboarding callback success
walletRouter.route("/success")
.get((req, res) => res.json({ message: "Stripe account connected successfully" }));

// Fetch wallet analytics (for business)
walletRouter.route("/business/analytics")
.get(authentication, authorization(["business"]), fetchWalletAnalytics);

module.exports = walletRouter;