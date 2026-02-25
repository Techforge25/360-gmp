const { Router } = require("express");
const { adminLogin } = require("../../controllers/admin/adminAuthController");

// Router instance
const adminAuthRouter = Router();

// Admin login
adminAuthRouter.route("/login").post(adminLogin);

module.exports = adminAuthRouter;