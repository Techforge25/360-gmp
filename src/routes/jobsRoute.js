const {Router} = require("express");
const { createJob, getAllJobs, getJobById, updateJob, deleteJob, fetchLatestJobs } = require("../controllers/jobsController");
const { authentication } = require("../middlewares/auth");
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
.put(authentication, checkSubscription,checkBusinessAccess, updateJob)
.delete(authentication, checkSubscription,checkBusinessAccess, deleteJob)

module.exports = jobsRouter;