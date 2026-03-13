const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { sumPlatformCommission, sumHelAmount } = require("../../controllers/admin/financialHubController");

// Router instance
const financialHubRouter = Router();

// Sum platform commission
financialHubRouter.route("/sumCommission")
.get(adminAuthentication, sumPlatformCommission);

// Sum held amount in escrow
financialHubRouter.route("/sumHeldAmount")
.get(adminAuthentication, sumHelAmount);

module.exports = financialHubRouter;