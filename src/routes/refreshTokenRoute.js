const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { refreshToken } = require("../controllers/refreshTokenController");

// router instance
const refreshTokenRouter = Router();

refreshTokenRouter.route("/updateRole").get(authentication, refreshToken);

module.exports = refreshTokenRouter;