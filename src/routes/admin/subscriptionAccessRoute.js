const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchSubscriptionStats } = require("../../controllers/admin/subscriptionAccessController");

// Router instance
const subscriptionAccessRouter = Router();

// Fetch subscription stats
subscriptionAccessRouter.route("/stats")
.get(adminAuthentication, fetchSubscriptionStats);

module.exports = subscriptionAccessRouter;