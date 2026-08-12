const { Router } = require("express");
const { adminManagementInitiator, createAdmin, fetchAdmins, viewAdmin, 
updateAdmin, deleteAdmin, updateAdminPassword, restoreAdmin } = require("../../controllers/admin/adminManagementController");
const { adminAuthentication, adminAuthorization, authorizeSuperAdmin } = require("../../middlewares/adminAuth");

// Router instance
const adminManagementRouter = Router();

// Inject router level middleware
adminManagementRouter.use(adminAuthentication, authorizeSuperAdmin);

// Initiator
adminManagementRouter.route("/init").get(adminManagementInitiator);

// Create admin
adminManagementRouter.route("/")
.post(createAdmin)
.get(fetchAdmins);

// View admin / Update admin / Delete admin
adminManagementRouter.route("/:adminId")
.get(viewAdmin)
.patch(updateAdmin)
.delete(deleteAdmin);

// Update admin password
adminManagementRouter.route("/:adminId/password")
.patch(updateAdminPassword);

// Restore admin
adminManagementRouter.route("/:adminId/restore")
.patch(restoreAdmin);

module.exports = adminManagementRouter;