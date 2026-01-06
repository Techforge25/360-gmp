const { Router } = require("express");
const { userSignup, userLogin } = require("../controllers/auth");

// Router instance
const authRouter = Router();

// User signup
authRouter.route("/user/signup").post(userSignup);

// User login
authRouter.route("/user/login").post(userLogin);

module.exports = authRouter;