const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { connectStripeAccount, WithdrawFunds, viewTransactionDetails } = require("../controllers/walletController");
const { addFundsUser, verifyAddFundsUser, fetchUserWalletAnalytics, 
fetchUserPurchases, fetchUserSpendingActivity } = require("../controllers/userWalletController");
const { fetchBusinessWalletAnalytics, fetchBusinessRecentTransactions, fetchBusinessEarnings, 
fetchBusinessFinancialPerformance, fetchBusinessWithdrawal } = require("../controllers/businessWalletController");

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

// View transaction details
walletRouter.route("/:orderId/transaction-details")
.get(authentication, authorization(["user", "business", "admin"]), viewTransactionDetails);


// ********************* FOR USER PROFILE ********************* //
// Add funds
walletRouter.route("/user/add-funds")
.post(authentication, authorization(["user"]), addFundsUser);

// Verify add funds
walletRouter.route("/user/add-funds/success")
.get(verifyAddFundsUser);

// Failed to add funds
walletRouter.route("/user/add-funds/cancel")
.get((req, res) => res.json({ message:"Add funds has been cancelled" }));

// Fetch wallet analytics
walletRouter.route("/user/analytics")
.get(authentication, authorization(["user"]), fetchUserWalletAnalytics);

// Fetch wallet analytics
walletRouter.route("/user/purchases")
.get(authentication, authorization(["user"]), fetchUserPurchases);

// Fetch spending activity
walletRouter.route("/user/spending-activity")
.get(authentication, authorization(["user"]), fetchUserSpendingActivity);


// ********************* FOR BUSINESS PROFILE ********************* //
// Fetch wallet analytics
walletRouter.route("/business/analytics")
.get(authentication, authorization(["business"]), fetchBusinessWalletAnalytics);

// Fetch recent transaction
walletRouter.route("/business/recent-transaction")
.get(authentication, authorization(["business"]), fetchBusinessRecentTransactions);

// Fetch financial performance for business
walletRouter.route("/business/financialPerformance")
.get(authentication, authorization(["business"]), fetchBusinessFinancialPerformance);

// Fetch business earnings
walletRouter.route("/business/earnings")
.get(authentication, authorization(["business"]), fetchBusinessEarnings);

// Fetch business withdrawals
walletRouter.route("/business/withdrawals")
.get(authentication, authorization(["business"]), fetchBusinessWithdrawal);

module.exports = walletRouter;