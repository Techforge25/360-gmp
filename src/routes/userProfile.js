const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createUserProfile, fetchUserAnalytics, viewUserProfile, 
deleteUserProfile, updateUserProfileBasicInfo, 
updateUserProfileContactInfo,
updateUserProfileLogo} = require("../controllers/userProfile");

// Router instance
const userProfileRouter = Router();

// Create user profile
userProfileRouter.route("/")
.post(authentication, createUserProfile);

// View user profile
userProfileRouter.route("/view")
.get(authentication, authorization(["user"]), viewUserProfile);

// Update user profile (basic info)
userProfileRouter.route("/update/basic-info")
.patch(authentication, authorization(["user"]), updateUserProfileBasicInfo);

// Update user profile (contact info)
userProfileRouter.route("/update/contact-info")
.patch(authentication, authorization(["user"]), updateUserProfileContactInfo);

// Update user profile (Profile logo)
userProfileRouter.route("/update/logo")
.patch(authentication, authorization(["user"]), updateUserProfileLogo);

// Delete user profile
userProfileRouter.route("/delete")
.get(authentication, authorization(["user"]), deleteUserProfile);

// Fetch user analytics
userProfileRouter.route("/analytics")
.get(authentication, authorization(["user"]), fetchUserAnalytics);

module.exports = userProfileRouter;