const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createUserProfile, fetchUserAnalytics, viewUserProfile, 
deleteUserProfile, updateUserProfileBasicInfo } = require("../controllers/userProfile");

// Router instance
const userProfileRouter = Router();

// Create user profile
userProfileRouter.route("/")
.post(authentication, createUserProfile);

// View user profile
userProfileRouter.route("/view")
.get(authentication, authorization(["user"]), viewUserProfile);

// Update user profile
userProfileRouter.route("/update/basic-info")
.patch(authentication, authorization(["user"]), updateUserProfileBasicInfo);

// Delete user profile
userProfileRouter.route("/delete")
.get(authentication, authorization(["user"]), deleteUserProfile);

// Fetch user analytics
userProfileRouter.route("/analytics")
.get(authentication, authorization(["user"]), fetchUserAnalytics);

module.exports = userProfileRouter;