const { Router } = require("express");
const { createJobApplicatiion, fetchjobApplications, viewJobapplication } = require("../controllers/jobApplicationController");
const { authentication } = require("../middlewares/auth");

// Router instance
const jobApplicationRouter = Router();

// Create job application / Fetch job applications for specific job
jobApplicationRouter.route("/:jobId")
.post(authentication, createJobApplicatiion)
.get(authentication, fetchjobApplications);

// View job Application
jobApplicationRouter.route("/view/:jobApplicationId").get(authentication, viewJobapplication);

module.exports = jobApplicationRouter;