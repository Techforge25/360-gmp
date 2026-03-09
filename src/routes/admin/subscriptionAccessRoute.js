const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchSubscriptionStats, fetchTrialUsers } = require("../../controllers/admin/subscriptionAccessController");

// Router instance
const subscriptionAccessRouter = Router();

// Fetch subscription stats
subscriptionAccessRouter.route("/stats")
.get(adminAuthentication, fetchSubscriptionStats);

// Fetch trial users
subscriptionAccessRouter.route("/trialUsers")
.get(adminAuthentication, fetchTrialUsers);

module.exports = subscriptionAccessRouter;