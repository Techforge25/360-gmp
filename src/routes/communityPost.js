const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const {
    createPost,
    getCommunityPosts,
    getPostById,
    updatePost,
    deletePost,
    likePost,
    addComment,
    getPostComments
} = require("../controllers/communityPostController");

// Router instance
const communityPostRouter = Router();

// Create post in community
communityPostRouter.route("/").post(authentication, createPost);

// Get all posts in a community (with pagination)
communityPostRouter.route("/community/:id").get(authentication, getCommunityPosts);

// Get post by ID
communityPostRouter.route("/:postId").get(authentication, getPostById);

// Update post (author only)
communityPostRouter.route("/:postId").put(authentication, updatePost);

// Delete post (author or admin only)
communityPostRouter.route("/:postId").delete(authentication, deletePost);

// Like/Unlike post
communityPostRouter.route("/:postId/like").post(authentication, likePost);

// Add comment to post
communityPostRouter.route("/:postId/comment").post(authentication, addComment);

// Get comments of a post (with pagination)
communityPostRouter.route("/:postId/comments").get(authentication, getPostComments);

module.exports = communityPostRouter;
