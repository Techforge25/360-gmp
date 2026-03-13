const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { sumPlatformCommission } = require("../../controllers/admin/financialHubController");

// Router instance
const financialHubRouter = Router();

// Sum platform commission
financialHubRouter.route("/sumCommission")
.get(adminAuthentication, sumPlatformCommission);

module.exports = financialHubRouter;