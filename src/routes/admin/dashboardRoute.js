const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchTotalPlatformRevenue, fetchTotalHeldAmount, 
fetchTotalTrialUsers, fetchTotalReportedJobs } = require("../../controllers/admin/dashboardController");

// Router instance
const dashboardRouter = Router();

// Fetch total platform revenue
dashboardRouter.route("/totalPlatformRevenue")
.get(adminAuthentication, fetchTotalPlatformRevenue);

// Fetch total held amount
dashboardRouter.route("/heldAmount")
.get(adminAuthentication, fetchTotalHeldAmount);

// Fetch total trial users
dashboardRouter.route("/totalTrialUsers")
.get(adminAuthentication, fetchTotalTrialUsers);

// Fetch total reported jobs
dashboardRouter.route("/totalReportedJobs")
.get(adminAuthentication, fetchTotalReportedJobs);

module.exports = dashboardRouter;