const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { likePost } = require("../controllers/postLikeController");
const limitRequest = require("../middlewares/rateLimit");

// Router instance
const postLikeRouter = Router();

// Like or unlike post
postLikeRouter.route("/:postId")
.post(authentication, authorization(["user", "business"]), limitRequest({ maxRequests: 5 }), likePost);

module.exports = postLikeRouter;