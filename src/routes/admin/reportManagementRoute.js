const { Router } = require("express");
const { adminAuthentication, adminAuthorization } = require("../../middlewares/adminAuth");
const { fetchReportStats, fetchJobReports, fetchBusinessProfileReports } = require("../../controllers/admin/reportManagementController");

// Router instance
const reportManagementRouter = Router();

// Fetch report stats
reportManagementRouter.route("/stats")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchReportStats);

// Fetch job reports
reportManagementRouter.route("/job")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchJobReports);

// Fetch Business profile reports
reportManagementRouter.route("/businessProfile")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchBusinessProfileReports);

module.exports = reportManagementRouter;