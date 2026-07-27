const { Router } = require("express");
const { adminAuthentication, adminAuthorization } = require("../../middlewares/adminAuth");
const { fetchReports } = require("../../controllers/admin/reportManagementController");

// Router instance
const reportManagementRouter = Router();

// Fetch reports
reportManagementRouter.route("/")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchReports);

module.exports = reportManagementRouter;