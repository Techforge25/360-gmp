const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchTotalUsers } = require("../../controllers/admin/userManagementController");

// Router instance
const userManagementRouter = Router();

// Fetch total users
userManagementRouter.route("/totalUsers")
.get(adminAuthentication, fetchTotalUsers);

module.exports = userManagementRouter;