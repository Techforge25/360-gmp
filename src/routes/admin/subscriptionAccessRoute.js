const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchSubscriptionStats, fetchTrialUsers, viewTrialUser, fetchPaidUsers, 
viewPaidUser } = require("../../controllers/admin/subscriptionAccessController");

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

// Fetch paid users
subscriptionAccessRouter.route("/paidUsers")
.get(adminAuthentication, fetchPaidUsers);

// View paid user
subscriptionAccessRouter.route("/paidUsers/:userId")
.get(adminAuthentication, viewPaidUser);

module.exports = subscriptionAccessRouter;