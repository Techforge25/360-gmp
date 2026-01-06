const { Router } = require("express");
const { userSignup, userLogin, logout } = require("../controllers/auth");
const { authentication } = require("../middlewares/auth");

// Router instance
const authRouter = Router();

// User signup
authRouter.route("/user/signup").post(userSignup);

// User login
authRouter.route("/user/login").post(userLogin);

// Logout
authRouter.route("/logout").get(logout);

module.exports = authRouter;