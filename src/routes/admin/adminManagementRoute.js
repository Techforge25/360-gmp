const { Router } = require("express");
const { createAdmin, assignModuleToAdmin } = require("../../controllers/admin/adminManagementController");
const { adminAuthentication, adminAuthorization } = require("../../middlewares/adminAuth");

// Router instance
const adminManagementRouter = Router();

// Create admin
adminManagementRouter.route("/")
.post(adminAuthentication, adminAuthorization(["superAdmin"]), createAdmin);

// Assign module to admin
adminManagementRouter.route("/:adminId/assignModule")
.patch(adminAuthentication, adminAuthorization(["superAdmin"]), assignModuleToAdmin);

module.exports = adminManagementRouter;