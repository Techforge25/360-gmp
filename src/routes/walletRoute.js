const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { connectStripeAccount, WithdrawFunds, viewTransactionTimeline, connectStripeAccountSuccess } = require("../controllers/walletController");
const { addFundsUser, verifyAddFundsUser, fetchUserWalletAnalytics, 
fetchUserPurchases, fetchUserSpendingActivity, fetchWithdrawalLogs,fetchfundDepositLogs } = require("../controllers/userWalletController");
const { fetchBusinessWalletAnalytics, fetchBusinessRecentTransactions, fetchBusinessEarnings, 
fetchBusinessFinancialPerformance, fetchBusinessWithdrawal, transferFunds } = require("../controllers/businessWalletController");

// Router instance
const walletRouter = Router();

// Connect Stripe account (onboarding)
walletRouter.route("/connect").post(authentication, connectStripeAccount);

// For Stripe onboarding callback retry 
walletRouter.route("/retry")
.get((request, response) => res.json({ message: "Please try connecting again" }));

// For Stripe onboarding callback success
walletRouter.route("/success").get(authentication, authorization(["business", "user"]), connectStripeAccountSuccess);

// Withdraw funds from wallet to Stripe account
walletRouter.route("/withdraw")
.post(authentication, authorization(["user", "business", "admin"]), WithdrawFunds);

// View transaction timeline
walletRouter.route("/:orderId/transaction-timeline")
.get(authentication, authorization(["user", "business", "admin"]), viewTransactionTimeline);


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

// Fetch user withdrawal logs
walletRouter.route("/user/withdrawal-logs")
.get(authentication, authorization(["user"]), fetchWithdrawalLogs);

// Fetch user deposit logs
walletRouter.route("/user/deposit-logs")
.get(authentication, authorization(["user"]), fetchfundDepositLogs);


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


// ********************* TRANSFER FUNDS BETWEEN BUSINESS AND USER *********************
walletRouter.route("/transferFunds")
.post(authentication, authorization(["user", "business"]), transferFunds);

module.exports = walletRouter;