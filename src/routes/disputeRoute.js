const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createDispute, fetchDisputes, viewDisputeDetails, changeDisputeStatus } = require("../controllers/disputController");

// Router instance
const disputeRouter = Router();

// Authentication required for all routes
disputeRouter.use(authentication);

// Create dispute (user) / Fetch disputes (admin)
disputeRouter.route("/")
.post(authorization(["user"]), createDispute)
.get(authorization(["admin"]), fetchDisputes);

// View dispute details (admin)
disputeRouter.route("/:disputeId")
.get(authorization(["admin"]), viewDisputeDetails);

// Change dispute status (admin)
disputeRouter.route("/:disputeId/status")
.patch(authorization(["admin"]), changeDisputeStatus);

module.exports = disputeRouter;