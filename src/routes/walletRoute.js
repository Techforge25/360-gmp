const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { connectStripeAccount, WithdrawFunds } = require("../controllers/walletController");
const { addFundsUser, verifyAddFundsUser, fetchUserWalletAnalytics } = require("../controllers/userWalletController");
const { fetchBusinessWalletAnalytics, fetchBusinessRecentTransactions, 
fetchBusinessEarnings } = require("../controllers/businessWalletController");

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
.post(authentication, authorization(["user"]), addFundsUser);

// Verify add funds
walletRouter.route("/user/add-funds/success")
.get(verifyAddFundsUser);

// Failed to add funds
walletRouter.route("/user/add-funds/cancel")
.get((req, res) => res.json({ message:"Add funds has been cancelled" }));

// Fetch wallet analytics (for user)
walletRouter.route("/user/analytics")
.get(authentication, authorization(["user"]), fetchUserWalletAnalytics);


// ********************* BUSINESS ********************* //
// Fetch wallet analytics
walletRouter.route("/business/analytics")
.get(authentication, authorization(["business"]), fetchBusinessWalletAnalytics);

// Fetch recent transaction
walletRouter.route("/business/recent-transaction")
.get(authentication, authorization(["business"]), fetchBusinessRecentTransactions);

// Fetch business earnings
walletRouter.route("/business/earnings")
.get(authentication, authorization(["business"]), fetchBusinessEarnings);

module.exports = walletRouter;