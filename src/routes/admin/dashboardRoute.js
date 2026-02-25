const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchTotalPlatformRevenue, fetchTotalHeldAmount } = require("../../controllers/admin/dashboardController");

// Router instance
const dashboardRouter = Router();

// Fetch total platform revenue
dashboardRouter.route("/totalPlatformRevenue")
.get(adminAuthentication, fetchTotalPlatformRevenue);

// Fetch total held amount
dashboardRouter.route("/heldAmount")
.get(adminAuthentication, fetchTotalHeldAmount);

module.exports = dashboardRouter;