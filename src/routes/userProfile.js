const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createUserProfile, fetchUserAnalytics } = require("../controllers/userProfile");

// Router instance
const userProfileRouter = Router();

// Create user profile
userProfileRouter.route("/")
.post(authentication, createUserProfile);

// Fetch user analytics
userProfileRouter.route("/analytics")
.get(authentication, authorization(["user"]), fetchUserAnalytics);

module.exports = userProfileRouter;