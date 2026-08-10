const { Router } = require("express");
const { adminAuthentication, adminAuthorization, grantAccessTo } = require("../../middlewares/adminAuth");
const { fetchAccountStats, fetchUserProfiles, fetchBusinessProfiles, viewUserProfile, 
viewBusinessProfile, approveBusinessProfile, rejectBusinessProfile } = require("../../controllers/admin/accountManagementController");

// Router instance
const accountManagementRouter = Router();

// Inject router level middleware
accountManagementRouter.use(adminAuthentication, grantAccessTo("Account Management"));

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

// Approve business profile
accountManagementRouter.route("/businessProfile/:businessProfileId/approve")
.patch(adminAuthentication, adminAuthorization(["superAdmin", "admin"]), approveBusinessProfile);

// Reject business profile
accountManagementRouter.route("/businessProfile/:businessProfileId/reject")
.patch(adminAuthentication, adminAuthorization(["superAdmin", "admin"]), rejectBusinessProfile);

module.exports = accountManagementRouter;