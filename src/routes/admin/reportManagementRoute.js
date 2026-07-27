const { Router } = require("express");
const { adminAuthentication, adminAuthorization } = require("../../middlewares/adminAuth");
const { fetchBusinessProfileReports, fetchReportStats } = require("../../controllers/admin/reportManagementController");

// Router instance
const reportManagementRouter = Router();

// Fetch report stats
reportManagementRouter.route("/stats")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchReportStats);

// Fetch Business profile reports
reportManagementRouter.route("/businessProfile")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchBusinessProfileReports);

module.exports = reportManagementRouter;