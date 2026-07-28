const { Router } = require("express");
const { adminAuthentication, adminAuthorization } = require("../../middlewares/adminAuth");
const { fetchAccountStats, fetchUserProfiles, fetchBusinessProfiles } = require("../../controllers/admin/accountManagementController");

// Router instance
const accountManagementRouter = Router();

// Fetch account stats
accountManagementRouter.route("/stats")
.get(adminAuthentication, adminAuthorization(["superAdmin", "admin"]), fetchAccountStats);

// Fetch user profiles
accountManagementRouter.route("/userProfiles")
.get(adminAuthentication, adminAuthorization(["superAdmin", "admin"]), fetchUserProfiles);

// Fetch business profiles
accountManagementRouter.route("/businessProfiles")
.get(adminAuthentication, adminAuthorization(["superAdmin", "admin"]), fetchBusinessProfiles);

module.exports = accountManagementRouter;