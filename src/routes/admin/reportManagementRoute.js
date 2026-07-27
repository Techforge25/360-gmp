const { Router } = require("express");
const { adminAuthentication, adminAuthorization } = require("../../middlewares/adminAuth");
const { fetchBusinessProfileReports } = require("../../controllers/admin/reportManagementController");

// Router instance
const reportManagementRouter = Router();

// Fetch Business profile reports
reportManagementRouter.route("/businessProfile")
.get(adminAuthentication, adminAuthorization(["superAdmin"]), fetchBusinessProfileReports);

module.exports = reportManagementRouter;