const { Router } = require("express");
const { userSignup, userLogin, logout, refreshToken, forgotPassword } = require("../controllers/auth");
const { authentication } = require("../middlewares/auth");

// Router instance
const authRouter = Router();

// User signup
authRouter.route("/user/signup").post(userSignup);

// User login
authRouter.route("/user/login").post(userLogin);

// Logout
authRouter.route("/logout").get(logout);

// Refresh token - (update user role)
authRouter.route("/refreshToken/updateRole").get(authentication, refreshToken);

// Forgot password
authRouter.route("/forgotPassword").post(forgotPassword);

module.exports = authRouter;