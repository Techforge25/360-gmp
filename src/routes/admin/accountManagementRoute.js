const { Router } = require("express");
const { adminAuthentication, adminAuthorization } = require("../../middlewares/adminAuth");
const { fetchAccountStats, fetchUserProfiles, fetchBusinessProfiles, 
viewUserProfile, viewBusinessProfile } = require("../../controllers/admin/accountManagementController");

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

// View user profile
accountManagementRouter.route("/userProfile/:userProfileId")
.get(adminAuthentication, adminAuthorization(["superAdmin", "admin"]), viewUserProfile);

// View business profile
accountManagementRouter.route("/businessProfile/:businessProfileId")
.get(adminAuthentication, adminAuthorization(["superAdmin", "admin"]), viewBusinessProfile);

module.exports = accountManagementRouter;