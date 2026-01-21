const {Router} = require("express");
const { createJob, getAllJobs, getJobById, updateJob, deleteJob } = require("../controllers/jobsController");
const { authentication } = require("../middlewares/auth");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");

// Router instance
const jobsRouter = Router();

// Create job / Fetch jobs
jobsRouter.route("/")
.post(authentication, checkSubscription,checkBusinessAccess, createJob)
.get(authentication, checkSubscription, getAllJobs);

// Fetch single job / Edit job / Delete job
jobsRouter.route("/:id").get(authentication, checkSubscription, getJobById);
jobsRouter.route("/:id").put(authentication, checkSubscription,checkBusinessAccess, updateJob); 
jobsRouter.route("/:id").delete(authentication, checkSubscription,checkBusinessAccess, deleteJob);

module.exports = jobsRouter;