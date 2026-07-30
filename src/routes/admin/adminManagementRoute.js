const { Router } = require("express");
const { createAdmin, fetchAdmins, viewAdmin, updateAdmin, 
deleteAdmin } = require("../../controllers/admin/adminManagementController");
const { adminAuthentication, adminAuthorization } = require("../../middlewares/adminAuth");

// Router instance
const adminManagementRouter = Router();

// Create admin
adminManagementRouter.route("/")
.post(adminAuthentication, adminAuthorization(["superAdmin"]), createAdmin)
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchAdmins);

// View admin / Update admin / Delete admin
adminManagementRouter.route("/:adminId")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), viewAdmin)
.patch(adminAuthentication, adminAuthorization(["superAdmin"]), updateAdmin)
.delete(adminAuthentication, adminAuthorization(["superAdmin"]), deleteAdmin);

module.exports = adminManagementRouter;