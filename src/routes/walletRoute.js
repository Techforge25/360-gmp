const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { connectSellerAccountStripe, WithdrawFunds } = require("../controllers/walletController");

// Router instance
const walletRouter = Router();

// Connect seller Stripe account (onboarding)
walletRouter.route("/connect").post(authentication, connectSellerAccountStripe);

// Withdraw funds from wallet to Stripe account
walletRouter.route("/withdraw").post(authentication, WithdrawFunds);

// For Stripe onboarding callback URLs
walletRouter.route("/retry").get((req, res) => {
    res.json({ message: "Please try connecting again" });
});

walletRouter.route("/success").get((req, res) => {
    res.json({ message: "Stripe account connected successfully" });
});

module.exports = walletRouter;
