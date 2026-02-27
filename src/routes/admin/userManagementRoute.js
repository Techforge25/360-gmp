const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchUsersStats, fetchTotalUsers } = require("../../controllers/admin/userManagementController");

// Router instance
const userManagementRouter = Router();

// Fetch users stats
userManagementRouter.route("/usersStats")
.get(adminAuthentication, fetchUsersStats);

// Fetch total user
userManagementRouter.route("/totalUsers")
.get(adminAuthentication, fetchTotalUsers);

module.exports = userManagementRouter;