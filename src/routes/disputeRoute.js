const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createDispute, createDisputeWithWallet, viewDisputeDetails, changeDisputeStatus, 
adminDecision, disputePaymentSuccess, sellerResponse, fetchProductsOfDisputedOrder } = require("../controllers/disputController");
const { adminAuthentication, adminAuthorization } = require("../middlewares/adminAuth");

// Router instance
const disputeRouter = Router();

// Create dispute with stripe
disputeRouter.route("/:orderId")
.post(authentication, authorization(["user"]), createDispute);

// Create dispute with wallet
disputeRouter.route("/:orderId/wallet")
.post(authentication, authorization(["user"]), createDisputeWithWallet);

// Dispute success
disputeRouter.route("/success")
.get(disputePaymentSuccess);

// View dispute details
disputeRouter.route("/:orderId")
.get(authentication, authorization(["user", "business"]), viewDisputeDetails);

// Fetch products of disputed order
disputeRouter.route("/:orderId/products")
.get(authentication, authorization(["user"]), fetchProductsOfDisputedOrder);

// Change dispute status (admin)
disputeRouter.route("/:orderId/status")
.patch(adminAuthentication, adminAuthorization(["admin"]), changeDisputeStatus);

// Seller response
disputeRouter.route("/:orderId/sellerResponse")
.patch(authentication, authorization(["business"]), sellerResponse);

// Admin decision (admin)
disputeRouter.route("/:orderId/decision")
.patch(adminAuthentication, adminAuthorization(["admin"]), adminDecision);

module.exports = disputeRouter;