const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createUserProfile } = require("../controllers/userProfile");

// Router instance
const userProfileRouter = Router();

// Create user profile
userProfileRouter.route("/").post(authentication, createUserProfile);

module.exports = userProfileRouter;