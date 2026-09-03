const { Router } = require("express");
const { adminAuthentication, grantAccessTo } = require("../../middlewares/adminAuth");
const { jobManagementInitiator } = require("../../controllers/admin/jobManagementController");

// Router instance
const jobManagementRouter = Router();

// Inject router level middleware
jobManagementRouter.use(adminAuthentication, grantAccessTo("Recruitment (Job Board)"));

// Initiator
jobManagementRouter.route("/init").get(jobManagementInitiator);

module.exports = jobManagementRouter;