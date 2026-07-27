const { Router } = require("express");
const { adminAuthentication, adminAuthorization } = require("../../middlewares/adminAuth");
const { fetchReportStats, fetchJobReports, fetchBusinessProfileReports, fetchProductReports, 
fetchCommunityReports, viewJobReport, viewBusinessReport, viewProductReport } = require("../../controllers/admin/reportManagementController");

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

// Fetch product reports
reportManagementRouter.route("/product")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchProductReports);

// Fetch community reports
reportManagementRouter.route("/community")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchCommunityReports);

// View job report
reportManagementRouter.route("/job/:reportId")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), viewJobReport);

// View business report
reportManagementRouter.route("/business/:reportId")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), viewBusinessReport);

// View product report
reportManagementRouter.route("/product/:reportId")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), viewProductReport);

module.exports = reportManagementRouter;