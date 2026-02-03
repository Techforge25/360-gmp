const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { connectStripeAccount, WithdrawFunds, fetchWalletAnalytics, addFunds, verifyAddFunds } = require("../controllers/walletController");

// Router instance
const walletRouter = Router();

// Connect Stripe account (onboarding)
walletRouter.route("/connect").post(authentication, connectStripeAccount);

// For Stripe onboarding callback retry 
walletRouter.route("/retry")
.get((req, res) => res.json({ message: "Please try connecting again" }));

// For Stripe onboarding callback success
walletRouter.route("/success")
.get((req, res) => res.json({ message: "Stripe account connected successfully" }));

// Withdraw funds from wallet to Stripe account
walletRouter.route("/withdraw")
.post(authentication, authorization(["user", "business", "admin"]), WithdrawFunds);

// Add funds
walletRouter.route("/user/add-funds")
.post(authentication, authorization(["user"]), addFunds);

// Verify add funds
walletRouter.route("/user/add-funds/success")
.get(verifyAddFunds);

// Failed to add funds
walletRouter.route("/user/add-funds/cancel")
.get((req, res) => res.json({ message:"Add funds has been cancelled" }));

// Fetch wallet analytics (for business)
walletRouter.route("/business/analytics")
.get(authentication, authorization(["business"]), fetchWalletAnalytics);

module.exports = walletRouter;