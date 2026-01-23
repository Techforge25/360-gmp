const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createReport, fetchJobReports, fetchCommunityReports, fetchCommunityPostReports, fetchCommunityPostCommentReports, viewReport, resolveReport, rejectReport } = require("../controllers/reportController");

// Router instance
const reportRouter = Router();

// Create report
reportRouter.route("/")
.post(authentication, authorization(["user"]), createReport);

// Fetch job reports
reportRouter.route("/type/job")
.get(authentication, authorization(["business", "admin", "user"]), fetchJobReports);

// Fetch community reports
reportRouter.route("/type/community")
.get(authentication, authorization(["business", "admin", "user"]), fetchCommunityReports);

// Fetch community post reports
reportRouter.route("/type/community-post")
.get(authentication, authorization(["business", "admin", "user"]), fetchCommunityPostReports);

// Fetch comment reports
reportRouter.route("/type/community-post-comment")
.get(authentication, authorization(["business", "admin", "user"]), fetchCommunityPostCommentReports);

// View report
reportRouter.route("/:reportId")
.get(authentication, authorization(["user", "business", "admin"]), viewReport);

// Resolve report
reportRouter.route("/:reportId/resolve")
.get(authentication, authorization(["user", "business", "admin"]), resolveReport);

// Reject report
reportRouter.route("/:reportId/reject")
.get(authentication, authorization(["user", "business", "admin"]), rejectReport);

module.exports = reportRouter;