const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createUserProfile, fetchUserAnalytics, viewUserProfile, 
deleteUserProfile, updateUserProfileBasicInfo, updateUserProfileContactInfo,
updateUserProfileLogo, updateUserProfileResume } = require("../controllers/userProfile");

// Router instance
const userProfileRouter = Router();

// Create user profile
userProfileRouter.route("/")
.post(authentication, createUserProfile);

// View user profile
userProfileRouter.route("/view")
.get(authentication, authorization(["user"]), viewUserProfile);

/* ======================= USER PROFILE UPDATES ======================= */
// Update basic info
userProfileRouter.route("/update/basic-info")
.patch(authentication, authorization(["user"]), updateUserProfileBasicInfo);

// Update contact info
userProfileRouter.route("/update/contact-info")
.patch(authentication, authorization(["user"]), updateUserProfileContactInfo);

// Update Profile logo
userProfileRouter.route("/update/logo")
.patch(authentication, authorization(["user"]), updateUserProfileLogo);

// Update Profile logo
userProfileRouter.route("/update/resume")
.patch(authentication, authorization(["user"]), updateUserProfileResume);
/* ======================= USER PROFILE UPDATES ======================= */

// Delete user profile
userProfileRouter.route("/delete")
.get(authentication, authorization(["user"]), deleteUserProfile);

// Fetch user analytics
userProfileRouter.route("/analytics")
.get(authentication, authorization(["user"]), fetchUserAnalytics);

module.exports = userProfileRouter;