const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchTotalUsers, fetchPendingUsers } = require("../../controllers/admin/userManagementController");

// Router instance
const userManagementRouter = Router();

// Fetch total users count
userManagementRouter.route("/totalUsers")
.get(adminAuthentication, fetchTotalUsers);

// Fetch pending users count
userManagementRouter.route("/pendingUsers")
.get(adminAuthentication, fetchPendingUsers);

module.exports = userManagementRouter;