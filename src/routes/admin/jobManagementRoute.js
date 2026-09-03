const { Router } = require("express");
const { adminAuthentication, grantAccessTo } = require("../../middlewares/adminAuth");
const { jobManagementInitiator, fetchJobStats, fetchActiveJobs } = require("../../controllers/admin/jobManagementController");

// Router instance
const jobManagementRouter = Router();

// Inject router level middleware
jobManagementRouter.use(adminAuthentication, grantAccessTo("Recruitment (Job Board)"));

// Initiator
jobManagementRouter.route("/init").get(jobManagementInitiator);

// Fetch stats
jobManagementRouter.route("/stats").get(fetchJobStats);

// Fetch stats
jobManagementRouter.route("/activeJobs").get(fetchActiveJobs);

module.exports = jobManagementRouter;