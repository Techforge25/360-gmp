const { Router } = require("express");
const { userSignup } = require("../controllers/auth");

// Router instance
const authRouter = Router();

// User signup
authRouter.route("/user/signup").post(userSignup);

module.exports = authRouter;