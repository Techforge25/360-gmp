const { Router } = require("express");
const { adminAuthentication, adminAuthorization, grantAccessTo } = require("../../middlewares/adminAuth");
const { reportInitiator, fetchReportStats, fetchJobReports, fetchBusinessProfileReports, 
fetchProductReports, fetchCommunityReports, viewJobReport, viewBusinessReport, 
viewProductReport, viewCommunityReport } = require("../../controllers/admin/reportManagementController");

// Router instance
const reportManagementRouter = Router();

// Inject router level middleware
reportManagementRouter.use(adminAuthentication, grantAccessTo("Reports"));

// Initiator
reportManagementRouter.route("/init").get(reportInitiator);

// Fetch report stats
reportManagementRouter.route("/stats").get(fetchReportStats);

// Fetch job reports
reportManagementRouter.route("/job").get(fetchJobReports);

// Fetch Business profile reports
reportManagementRouter.route("/businessProfile").get(fetchBusinessProfileReports);

// Fetch product reports
reportManagementRouter.route("/product").get(fetchProductReports);

// Fetch community reports
reportManagementRouter.route("/community").get(fetchCommunityReports);

// View job report
reportManagementRouter.route("/job/:reportId").get(viewJobReport);

// View business report
reportManagementRouter.route("/business/:reportId").get(viewBusinessReport);

// View product report
reportManagementRouter.route("/product/:reportId").get(viewProductReport);

// View community report
reportManagementRouter.route("/community/:reportId").get(viewCommunityReport);

module.exports = reportManagementRouter;