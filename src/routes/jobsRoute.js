const {Router} = require("express");
const { createJob, getAllJobs, getJobById, updateJob, deleteJob, fetchLatestJobs, 
fetchMyAppliedJobs, fetchHiredJobs } = require("../controllers/jobsController");
const { authentication, authorization } = require("../middlewares/auth");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");

// Router instance
const jobsRouter = Router();

// Create job / Fetch jobs
jobsRouter.route("/")
.post(authentication, checkSubscription,checkBusinessAccess, createJob)
.get(authentication, checkSubscription, getAllJobs);

// Get latest jobs (For market place)
jobsRouter.route("/latest/marketplace")
.get(authentication, fetchLatestJobs);

// Fetch Single job / Edit job / Delete job
jobsRouter.route("/:id")
.get(authentication, checkSubscription, getJobById)
.put(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, updateJob)
.delete(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, deleteJob);

// Fetch applied jobs
jobsRouter.route("/user/applied")
.get(authentication, authorization(["user"]), fetchMyAppliedJobs);

// Fetch hired jobs
jobsRouter.route("/user/hired")
.get(authentication, authorization(["user"]), fetchHiredJobs);

module.exports = jobsRouter;