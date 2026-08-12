const { Router } = require("express");
const { adminAuthentication, adminAuthorization, grantAccessTo } = require("../../middlewares/adminAuth");
const { fetchAccountStats, fetchUserProfiles, fetchBusinessProfiles, viewUserProfile, 
viewBusinessProfile, approveBusinessProfile, rejectBusinessProfile } = require("../../controllers/admin/accountManagementController");

// Router instance
const accountManagementRouter = Router();

// Inject router level middleware
accountManagementRouter.use(adminAuthentication, grantAccessTo("Account Management"));

// Fetch account stats
accountManagementRouter.route("/stats").get(fetchAccountStats);

// Fetch user profiles
accountManagementRouter.route("/userProfiles").get(fetchUserProfiles);

// Fetch business profiles
accountManagementRouter.route("/businessProfiles").get(fetchBusinessProfiles);

// View user profile
accountManagementRouter.route("/userProfile/:userProfileId").get(viewUserProfile);

// View business profile
accountManagementRouter.route("/businessProfile/:businessProfileId").get(viewBusinessProfile);

// Approve business profile
accountManagementRouter.route("/businessProfile/:businessProfileId/approve").patch(approveBusinessProfile);

// Reject business profile
accountManagementRouter.route("/businessProfile/:businessProfileId/reject").patch(rejectBusinessProfile);

module.exports = accountManagementRouter;