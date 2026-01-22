const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { saveJob, fetchMySavedJobs, unsavedJob } = require("../controllers/savedJobController");

// Router instance
const savedJobRouter = Router();

// Save job / Unsave job
savedJobRouter.route("/:jobId")
.post(authentication, authorization(["user"]), saveJob)
.delete(authentication, authorization(["user"]), unsavedJob);

// Fetch my saved jobs
savedJobRouter.route("/")
.get(authentication, authorization(["user"]), fetchMySavedJobs)

module.exports = savedJobRouter;