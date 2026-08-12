const { Router } = require("express");
const { adminAuthentication, grantAccessTo } = require("../../middlewares/adminAuth");
const { fetchSubscriptionStats, fetchTrialUsers, viewTrialUser, fetchPaidUsers, 
viewPaidUser, subscriptionInitiator } = require("../../controllers/admin/subscriptionAccessController");

// Router instance
const subscriptionAccessRouter = Router();

// Inject router level middleware
subscriptionAccessRouter.use(adminAuthentication, grantAccessTo("Subscription & Access"));

// Initiator
subscriptionAccessRouter.route("/init").get(subscriptionInitiator);

// Fetch subscription stats
subscriptionAccessRouter.route("/stats").get(fetchSubscriptionStats);

// Fetch trial users
subscriptionAccessRouter.route("/trialUsers").get(fetchTrialUsers);

// View trial user
subscriptionAccessRouter.route("/trialUsers/:userId").get(viewTrialUser);

// Fetch paid users
subscriptionAccessRouter.route("/paidUsers").get(fetchPaidUsers);

// View paid user
subscriptionAccessRouter.route("/paidUsers/:userId").get(viewPaidUser);

module.exports = subscriptionAccessRouter;