const { Router } = require("express");
const { adminAuthentication, adminAuthorization, authorizeSuperAdmin } = require("../../middlewares/adminAuth");
const { dashboardInitiator, fetchDashboardStats } = require("../../controllers/admin/dashboardController");

// Router instance
const dashboardRouter = Router();

// Inject router level middleware
dashboardRouter.use(adminAuthentication, authorizeSuperAdmin);

// Initiator
dashboardRouter.route("/init").get(dashboardInitiator);

// Fetch dashboard stats
dashboardRouter.route("/stats")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchDashboardStats);

module.exports = dashboardRouter;