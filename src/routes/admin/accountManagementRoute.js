const { Router } = require("express");
const { adminAuthentication, adminAuthorization } = require("../../middlewares/adminAuth");
const { fetchAccountStats } = require("../../controllers/admin/accountManagementController");

// Router instance
const accountManagementRouter = Router();

// Fetch account stats
accountManagementRouter.route("/stats")
.get(adminAuthentication, adminAuthorization(["superAdmin", "admin"]), fetchAccountStats);

module.exports = accountManagementRouter;