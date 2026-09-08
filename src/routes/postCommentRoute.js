const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const limitRequest = require("../middlewares/rateLimit");
const { createComment, fetchComments } = require("../controllers/postCommentController");

// Router instance
const postCommentRouter = Router();

// Create comment / Fetch comments
postCommentRouter.route("/:postId")
.post(authentication, authorization(["user", "business"]), limitRequest({ maxRequests: 10 }), createComment)
.get(authentication, authorization(["user", "business"]), fetchComments);

module.exports = postCommentRouter;