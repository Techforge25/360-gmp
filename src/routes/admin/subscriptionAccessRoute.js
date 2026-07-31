const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchSubscriptionStats, fetchTrialUsers, viewTrialUser, fetchPaidUsers, 
fetchExpiringSubscriptions } = require("../../controllers/admin/subscriptionAccessController");

// Router instance
const subscriptionAccessRouter = Router();

// Fetch subscription stats
subscriptionAccessRouter.route("/stats")
.get(adminAuthentication, fetchSubscriptionStats);

// Fetch trial users
subscriptionAccessRouter.route("/trialUsers")
.get(adminAuthentication, fetchTrialUsers);

// View trial user
subscriptionAccessRouter.route("/trialUsers/:userId")
.get(adminAuthentication, viewTrialUser);

// Fetch premium users
subscriptionAccessRouter.route("/paidUsers")
.get(adminAuthentication, fetchPaidUsers);

// Fetch subscriptions expiring soon users
subscriptionAccessRouter.route("/expiringSoon")
.get(adminAuthentication, fetchExpiringSubscriptions);

module.exports = subscriptionAccessRouter;