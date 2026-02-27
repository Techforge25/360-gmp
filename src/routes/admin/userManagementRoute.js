const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchUsersStats, fetchTotalUsers, fetchPendingUsers } = require("../../controllers/admin/userManagementController");

// Router instance
const userManagementRouter = Router();

// Fetch users stats
userManagementRouter.route("/usersStats")
.get(adminAuthentication, fetchUsersStats);

// Fetch total user
userManagementRouter.route("/totalUsers")
.get(adminAuthentication, fetchTotalUsers);

// Fetch pending user
userManagementRouter.route("/pendingUsers")
.get(adminAuthentication, fetchPendingUsers);

module.exports = userManagementRouter;