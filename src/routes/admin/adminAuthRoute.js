const { Router } = require("express");
const { adminLogin, authMe, adminLogout, adminRefreshToken } = require("../../controllers/admin/adminAuthController");
const { adminAuthentication } = require("../../middlewares/adminAuth");

// Router instance
const adminAuthRouter = Router();

// Admin login
adminAuthRouter.route("/login").post(adminLogin);

// Auth me
adminAuthRouter.route("/me").get(adminAuthentication, authMe);

// Admin refresh token
adminAuthRouter.route("/refreshToken").get(adminRefreshToken);

// Admin logout
adminAuthRouter.route("/logout").get(adminAuthentication, adminLogout);

module.exports = adminAuthRouter;