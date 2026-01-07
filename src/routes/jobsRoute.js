const {Router} = require("express");
const { createJob, getAllJobs, getJobById, updateJob, deleteJob } = require("../controllers/jobsController");
const { authentication } = require("../middlewares/auth");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");

const jobsRouter = Router();

jobsRouter.route("/").post(authentication, checkSubscription,checkBusinessAccess, createJob);
jobsRouter.route("/").get(authentication, checkSubscription, getAllJobs);
jobsRouter.route("/:id").get(authentication, checkSubscription, getJobById);
jobsRouter.route("/:id").put(authentication, checkSubscription,checkBusinessAccess, updateJob); 
jobsRouter.route("/:id").delete(authentication, checkSubscription,checkBusinessAccess, deleteJob);

module.exports = jobsRouter;