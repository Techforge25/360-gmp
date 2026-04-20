const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createDispute, viewDisputeDetails, changeDisputeStatus, 
adminDecision, disputePaymentSuccess, sellerResponse } = require("../controllers/disputController");
const { adminAuthentication, adminAuthorization } = require("../middlewares/adminAuth");

// Router instance
const disputeRouter = Router();

// Create dispute (user) / Fetch disputes (admin)
disputeRouter.route("/:orderId")
.post(authentication, authorization(["user"]), createDispute);

// Dispute success
disputeRouter.route("/success")
.get(disputePaymentSuccess);

// View dispute details (admin)
disputeRouter.route("/:orderId")
.get(authentication, authorization(["user", "business"]), viewDisputeDetails);

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