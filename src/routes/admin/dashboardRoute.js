const { Router } = require("express");
const { adminAuthentication, adminAuthorization, authorizeSuperAdmin } = require("../../middlewares/adminAuth");
const { dashboardInitiator, fetchDashboardStats, fetchLatestBusinesses } = require("../../controllers/admin/dashboardController");

// Router instance
const dashboardRouter = Router();

// Inject router level middleware
dashboardRouter.use(adminAuthentication, authorizeSuperAdmin);

// Initiator
dashboardRouter.route("/init").get(dashboardInitiator);

// Fetch dashboard stats
dashboardRouter.route("/stats").get(fetchDashboardStats);

// Fetch latest business
dashboardRouter.route("/latestBusinesses").get(fetchLatestBusinesses);

module.exports = dashboardRouter;