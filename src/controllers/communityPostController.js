const CommunityPost = require("../models/communityPostModel");
const Community = require("../models/communityModel");
const CommunityMembership = require("../models/communityMembership");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createPostSchema, updatePostSchema, likePostSchema, addCommentSchema } = require("../validations/communityPostValidator");

// Helper function to get userProfileId from userId
const getUserProfileId = async (userId) => {
    const userProfile = await UserProfile.findOne({ userId });
    if(!userProfile) throw new ApiError(404, "User profile not found. Please create your profile first.");
    return userProfile._id;
};

// Helper function to check if user is member of community
const checkCommunityMembership = async (communityId, userProfileId) => {
    const membership = await CommunityMembership.findOne({
        communityId: communityId,
        userProfileId: userProfileId,
        status: "approved"
    });
    if(!membership) {
        throw new ApiError(403, "You must be a member of this community to perform this action");
    }
    return membership;
};

// Create Post in Community
const createPost = asyncHandler(async (request, response) => {
    const { error, value } = createPostSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Get community
    const community = await Community.findById(value.communityId);
    if(!community) throw new ApiError(404, "Community not found");

    // Get user profile
    const userProfileId = await getUserProfileId(request.user._id);

    // Check if user is a member of the community
    await checkCommunityMembership(value.communityId, userProfileId);

    // Create post
    const post = await CommunityPost.create({
        ...value,
        authorUserProfileId: userProfileId
    });

    if(!post) throw new ApiError(500, "Failed to create post");

    // Populate author details
    await post.populate("authorUserProfileId", "fullName title imageProfile");

    return response.status(201).json(
        new ApiResponse(201, post, "Post created successfully")
    );
});

// Get All Posts in Community (with pagination)
const getCommunityPosts = asyncHandler(async (request, response) => {
    const { id } = request.params; // communityId
    const { page = 1, limit = 20 } = request.query;

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Check if user is member (for private communities)
    let isMember = false;
    if(request.user?._id) {
        try {
            const userProfileId = await getUserProfileId(request.user._id);
            const membership = await CommunityMembership.findOne({
                communityId: id,
                userProfileId: userProfileId,
                status: "approved"
            });
            if(membership) isMember = true;
        } catch(err) {
            // User not logged in or no profile
        }
    }

    // For private communities, only members can see posts
    if(community.type === "private" && !isMember && community.type !== "public") {
        throw new ApiError(403, "You must be a member to view posts in this community");
    }

    // Pagination
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Get total count
    const totalPosts = await CommunityPost.countDocuments({ communityId: id });
    const totalPages = Math.ceil(totalPosts / limitNumber);

    // Get posts
    const posts = await CommunityPost.find({ communityId: id })
        .populate("authorUserProfileId", "fullName title imageProfile")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    // Check if user liked each post
    if(request.user?._id) {
        try {
            const userProfileId = await getUserProfileId(request.user._id);
            for(let post of posts) {
                post.likedByUser = post.likes.some(
                    like => like.userProfileId.toString() === userProfileId.toString()
                );
            }
        } catch(err) {
            // User not logged in
        }
    }

    const paginationInfo = {
        currentPage: pageNumber,
        totalPages: totalPages,
        totalPosts: totalPosts,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
    };

    return response.status(200).json(
        new ApiResponse(200, { posts, pagination: paginationInfo }, "Posts fetched successfully")
    );
});

// Get Post By ID
const getPostById = asyncHandler(async (request, response) => {
    const { postId } = request.params;

    const post = await CommunityPost.findById(postId)
        .populate("authorUserProfileId", "fullName title imageProfile bio")
        .populate("communityId", "name type");

    if(!post) throw new ApiError(404, "Post not found");

    // Check if user is member (for private communities)
    if(post.communityId.type === "private" && request.user?._id) {
        try {
            const userProfileId = await getUserProfileId(request.user._id);
            const membership = await CommunityMembership.findOne({
                communityId: post.communityId._id,
                userProfileId: userProfileId,
                status: "approved"
            });
            if(!membership) {
                throw new ApiError(403, "You must be a member to view this post");
            }
        } catch(err) {
            throw new ApiError(403, "You must be a member to view this post");
        }
    }

    // Check if user liked the post
    if(request.user?._id) {
        try {
            const userProfileId = await getUserProfileId(request.user._id);
            post.likedByUser = post.likes.some(
                like => like.userProfileId.toString() === userProfileId.toString()
            );
        } catch(err) {
            post.likedByUser = false;
        }
    }

    return response.status(200).json(
        new ApiResponse(200, post, "Post fetched successfully")
    );
});

// Update Post
const updatePost = asyncHandler(async (request, response) => {
    const { postId } = request.params;

    const { error, value } = updatePostSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Get post
    const post = await CommunityPost.findById(postId);
    if(!post) throw new ApiError(404, "Post not found");

    // Get user profile
    const userProfileId = await getUserProfileId(request.user._id);

    // Check if user is the author
    if(post.authorUserProfileId.toString() !== userProfileId.toString()) {
        throw new ApiError(403, "Only post author can update the post");
    }

    // Update post
    const updatedPost = await CommunityPost.findByIdAndUpdate(
        postId,
        {
            ...value,
            isEdited: true,
            editedAt: new Date()
        },
        { new: true, runValidators: true }
    )
        .populate("authorUserProfileId", "fullName title imageProfile");

    return response.status(200).json(
        new ApiResponse(200, updatedPost, "Post updated successfully")
    );
});

// Delete Post
const deletePost = asyncHandler(async (request, response) => {
    const { postId } = request.params;

    // Get post
    const post = await CommunityPost.findById(postId);
    if(!post) throw new ApiError(404, "Post not found");

    // Get user profile
    const userProfileId = await getUserProfileId(request.user._id);

    // Check if user is the author or admin/moderator
    const isAuthor = post.authorUserProfileId.toString() === userProfileId.toString();
    
    // Check if user is admin/moderator of the community
    const membership = await CommunityMembership.findOne({
        communityId: post.communityId,
        userProfileId: userProfileId,
        role: { $in: ["owner", "admin", "moderator"] },
        status: "approved"
    });

    if(!isAuthor && !membership) {
        throw new ApiError(403, "Only post author or community admins can delete the post");
    }

    // Delete post
    await CommunityPost.findByIdAndDelete(postId);

    return response.status(200).json(
        new ApiResponse(200, null, "Post deleted successfully")
    );
});

// Like/Unlike Post
const likePost = asyncHandler(async (request, response) => {
    const { postId } = request.params;

    // Get post
    const post = await CommunityPost.findById(postId);
    if(!post) throw new ApiError(404, "Post not found");

    // Get user profile
    const userProfileId = await getUserProfileId(request.user._id);

    // Check if user is member of the community
    await checkCommunityMembership(post.communityId, userProfileId);

    // Check if already liked
    const existingLikeIndex = post.likes.findIndex(
        like => like.userProfileId.toString() === userProfileId.toString()
    );

    if(existingLikeIndex > -1) {
        // Unlike: Remove like
        post.likes.splice(existingLikeIndex, 1);
        post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
        // Like: Add like
        post.likes.push({
            userProfileId: userProfileId,
            likedAt: new Date()
        });
        post.likeCount += 1;
    }

    await post.save();

    return response.status(200).json(
        new ApiResponse(200, { 
            likeCount: post.likeCount, 
            isLiked: existingLikeIndex === -1 
        }, existingLikeIndex === -1 ? "Post liked successfully" : "Post unliked successfully")
    );
});

// Add Comment to Post
const addComment = asyncHandler(async (request, response) => {
    const { postId } = request.params;
    const { error, value } = addCommentSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Get post
    const post = await CommunityPost.findById(postId);
    if(!post) throw new ApiError(404, "Post not found");

    // Get user profile
    const userProfileId = await getUserProfileId(request.user._id);

    // Check if user is member of the community
    await checkCommunityMembership(post.communityId, userProfileId);

    // Add comment
    post.comments.push({
        userProfileId: userProfileId,
        content: value.content,
        commentedAt: new Date()
    });
    post.commentCount += 1;

    await post.save();

    // Populate latest comment
    const latestComment = post.comments[post.comments.length - 1];
    await latestComment.populate("userProfileId", "fullName title imageProfile");

    return response.status(201).json(
        new ApiResponse(201, { comment: latestComment, commentCount: post.commentCount }, "Comment added successfully")
    );
});

// Get Post Comments (with pagination)
const getPostComments = asyncHandler(async (request, response) => {
    const { postId } = request.params;
    const { page = 1, limit = 20 } = request.query;

    // Get post
    const post = await CommunityPost.findById(postId).select("comments");
    if(!post) throw new ApiError(404, "Post not found");

    // Pagination
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Get comments (reverse to get oldest first, or slice and reverse for newest first)
    const allComments = post.comments.reverse(); // Newest first
    const totalComments = allComments.length;
    const totalPages = Math.ceil(totalComments / limitNumber);
    const comments = allComments.slice(skip, skip + limitNumber);

    // Populate user profiles
    for(let comment of comments) {
        await comment.populate("userProfileId", "fullName title imageProfile");
    }

    const paginationInfo = {
        currentPage: pageNumber,
        totalPages: totalPages,
        totalComments: totalComments,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
    };

    return response.status(200).json(
        new ApiResponse(200, { comments, pagination: paginationInfo }, "Comments fetched successfully")
    );
});

module.exports = {
    createPost,
    getCommunityPosts,
    getPostById,
    updatePost,
    deletePost,
    likePost,
    addComment,
    getPostComments
};
