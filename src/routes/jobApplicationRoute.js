const { Router } = require("express");
const { createJobApplicatiion, fetchAlljobApplications, viewJobapplication } = require("../controllers/jobApplicationController");
const { authentication } = require("../middlewares/auth");

// Router instance
const jobApplicationRouter = Router();

// Create job application
jobApplicationRouter.route("/:jobId").post(authentication, createJobApplicatiion);

// Fetch all job applications
jobApplicationRouter.route("/").get(authentication, fetchAlljobApplications);

// View job Application
jobApplicationRouter.route("/:id").get(authentication, viewJobapplication);

module.exports = jobApplicationRouter;