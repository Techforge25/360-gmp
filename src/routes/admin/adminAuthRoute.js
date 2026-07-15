const { Router } = require("express");
const { adminLogin, adminLogout, adminRefreshToken, adminAuthCheck } = require("../../controllers/admin/adminAuthController");
const { adminAuthentication } = require("../../middlewares/adminAuth");

// Router instance
const adminAuthRouter = Router();

// Admin login
adminAuthRouter.route("/login").post(adminLogin);

// Admin auth check
adminAuthRouter.route("/me").get(adminAuthentication, adminAuthCheck);

// Admin logout
adminAuthRouter.route("/logout").get(adminAuthentication, adminLogout);

// Admin refresh token
adminAuthRouter.route("/refreshToken").get(adminRefreshToken);

module.exports = adminAuthRouter;