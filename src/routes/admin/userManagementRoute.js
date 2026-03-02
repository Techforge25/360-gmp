const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchUsersStats, fetchAllUsers } = require("../../controllers/admin/userManagementController");

// Router instance
const userManagementRouter = Router();

// Fetch users stats
userManagementRouter.route("/usersStats")
.get(adminAuthentication, fetchUsersStats);

// Fetch all users
userManagementRouter.route("/allUsers")
.get(adminAuthentication, fetchAllUsers);

module.exports = userManagementRouter;