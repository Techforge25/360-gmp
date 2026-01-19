const { Router } = require("express");
const { createJobApplicatiion, fetchjobApplications, viewJobapplication, updateJobApplicationStatus } = require("../controllers/jobApplicationController");
const { authentication, authorization } = require("../middlewares/auth");

// Router instance
const jobApplicationRouter = Router();

// Create job application / Fetch job applications for specific job
jobApplicationRouter.route("/:jobId")
.post(authentication, createJobApplicatiion)
.get(authentication, fetchjobApplications);

// View job Application
jobApplicationRouter.route("/:jobApplicationId/view/")
.get(authentication, authorization(["business"]), viewJobapplication);

// Update job application status
jobApplicationRouter.route("/:jobApplicationId/updateStatus")
.patch(authentication, authorization(["business"]), updateJobApplicationStatus);

module.exports = jobApplicationRouter;