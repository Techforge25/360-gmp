const { Router } = require("express");
const { adminLogin, adminLogout } = require("../../controllers/admin/adminAuthController");
const { adminAuthentication } = require("../../middlewares/adminAuth");

// Router instance
const adminAuthRouter = Router();

// Admin login
adminAuthRouter.route("/login").post(adminLogin);

// Admin logout
adminAuthRouter.route("/logout").get(adminAuthentication, adminLogout);

module.exports = adminAuthRouter;