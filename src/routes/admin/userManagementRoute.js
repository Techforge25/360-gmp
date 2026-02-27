const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchUsersStats } = require("../../controllers/admin/userManagementController");

// Router instance
const userManagementRouter = Router();

// Fetch users stats
userManagementRouter.route("/usersStats")
.get(adminAuthentication, fetchUsersStats);

module.exports = userManagementRouter;