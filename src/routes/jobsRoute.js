const {Router} = require("express");
const { createJob, getAllJobs, getJobById, updateJob, deleteJob, fetchLatestJobs, 
fetchMyAppliedJobs, fetchHiredJobs } = require("../controllers/jobsController");
const { authentication, authorization } = require("../middlewares/auth");

// Router instance
const jobsRouter = Router();

// Create job / Fetch jobs
jobsRouter.route("/")
.post(authentication, createJob)
.get(authentication, getAllJobs);

// Get latest jobs (For market place)
jobsRouter.route("/latest/marketplace")
.get(authentication, fetchLatestJobs);

// Fetch Single job / Edit job / Delete job
jobsRouter.route("/:id")
.get(authentication, getJobById)
.patch(authentication, authorization(["business"]), updateJob)
.delete(authentication, authorization(["business"]), deleteJob);

// Fetch applied jobs
jobsRouter.route("/user/applied")
.get(authentication, authorization(["user"]), fetchMyAppliedJobs);

// Fetch hired jobs
jobsRouter.route("/user/hired")
.get(authentication, authorization(["user"]), fetchHiredJobs);

module.exports = jobsRouter;