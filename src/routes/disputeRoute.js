const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createDispute, fetchDisputes, viewDisputeDetails, 
changeDisputeStatus, adminDecision } = require("../controllers/disputController");
const { adminAuthentication, adminAuthorization } = require("../middlewares/adminAuth");

// Router instance
const disputeRouter = Router();

// Create dispute (user) / Fetch disputes (admin)
disputeRouter.route("/")
.post(authentication, authorization(["user"]), createDispute)
.get(adminAuthentication, adminAuthorization(["admin"]), fetchDisputes);

// View dispute details (admin)
disputeRouter.route("/:disputeId")
.get(adminAuthentication, adminAuthorization(["admin"]), viewDisputeDetails);

// Change dispute status (admin)
disputeRouter.route("/:disputeId/status")
.patch(adminAuthentication, adminAuthorization(["admin"]), changeDisputeStatus);

// Admin decision (admin)
disputeRouter.route("/:disputeId/decision")
.patch(adminAuthentication, adminAuthorization(["admin"]), adminDecision);

module.exports = disputeRouter;