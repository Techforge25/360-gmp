const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const limitRequest = require("../middlewares/rateLimit");
const { createComment } = require("../controllers/postCommentController");

// Router instance
const postCommentRouter = Router();

// Create comment
postCommentRouter.route("/:postId")
.post(authentication, authorization(["user", "business"]), limitRequest({ maxRequests: 10 }), createComment);

module.exports = postCommentRouter;