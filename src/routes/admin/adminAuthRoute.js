const { Router } = require("express");
const { adminLogin, authMe, adminLogout, adminRefreshToken, 
authStatus } = require("../../controllers/admin/adminAuthController");
const { adminAuthentication } = require("../../middlewares/adminAuth");

// Router instance
const adminAuthRouter = Router();

// Login
adminAuthRouter.route("/login").post(adminLogin);

// Auth me
adminAuthRouter.route("/me").get(adminAuthentication, authMe);

// Refresh token
adminAuthRouter.route("/refreshToken").get(adminRefreshToken);

// Logout
adminAuthRouter.route("/logout").get(adminAuthentication, adminLogout);

// Auth status
adminAuthRouter.route("/status").get(authStatus);

module.exports = adminAuthRouter;