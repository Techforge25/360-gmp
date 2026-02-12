const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createDispute, fetchDisputes, viewDisputeDetails } = require("../controllers/disputController");

// Router instance
const disputeRouter = Router();

disputeRouter.use(authentication);

// Create dispute (user) / Fetch disputes (admin)
disputeRouter.route("/")
.post(authorization(["user"]), createDispute)
.get(authorization(["admin"]), fetchDisputes);

// View dispute details (admin)
disputeRouter.route("/:disputeId")
.get(authorization(["admin"]), viewDisputeDetails);

module.exports = disputeRouter;