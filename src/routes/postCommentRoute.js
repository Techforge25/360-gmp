const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const limitRequest = require("../middlewares/rateLimit");
const { createComment, fetchComments, updateComment } = require("../controllers/postCommentController");

// Router instance
const postCommentRouter = Router();

// Create comment / Fetch comments
postCommentRouter.route("/:postId")
.post(authentication, authorization(["user", "business"]), limitRequest({ maxRequests: 10 }), createComment)
.get(authentication, authorization(["user", "business"]), fetchComments);

// Update comment
postCommentRouter.route("/:commentId")
.put(authentication, authorization(["user", "business"]), updateComment);

module.exports = postCommentRouter;