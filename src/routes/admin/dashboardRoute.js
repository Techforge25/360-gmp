const { Router } = require("express");
const { adminAuthentication, adminAuthorization, authorizeSuperAdmin } = require("../../middlewares/adminAuth");
const { dashboardInitiator, fetchDashboardStats, fetchLatestBusinesses, 
fetchRevenueGraph, fetchSubscriptionChart, viewLatestBusinessProfile } = require("../../controllers/admin/dashboardController");

// Router instance
const dashboardRouter = Router();

// Inject router level middleware
dashboardRouter.use(adminAuthentication, authorizeSuperAdmin);

// Initiator
dashboardRouter.route("/init").get(dashboardInitiator);

// Fetch dashboard stats
dashboardRouter.route("/stats").get(fetchDashboardStats);

// Fetch subscription chart
dashboardRouter.route("/subscriptionChart").get(fetchSubscriptionChart);

// Fetch revenue graph
dashboardRouter.route("/revenueGraph").get(fetchRevenueGraph);

// Fetch latest business
dashboardRouter.route("/latestBusinesses").get(fetchLatestBusinesses);

// View latest business profile
dashboardRouter.route("/latestBusinesses/:businessProfileId").get(viewLatestBusinessProfile);

module.exports = dashboardRouter;