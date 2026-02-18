const CommunityPost = require("../models/communityPostModel");
const Community = require("../models/communityModel");
const CommunityMembership = require("../models/communityMembership");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createPostSchema, updatePostSchema, likePostSchema, addCommentSchema } = require("../validations/communityPostValidator");
const BusinessProfile = require("../models/businessProfileSchema");
const { isValidObjectId } = require("mongoose");

// Helper function to get userProfileId from userId
const getUserProfileId = async (userId) => {
    const userProfile = await UserProfile.findOne({ userId });
    if(!userProfile) throw new ApiError(404, "User profile not found. Please create your profile first.");
    return userProfile._id;
};

// Helper function to determine if user is business owner or normal user and return appropriate profile ID and model
const getIdentity = async (userId, communityId) => {
    const community = await Community.findById(communityId);
    if (!community) throw new ApiError(404, "Community not found");

    // Check if the user is the owner of the business that owns this community
    const business = await BusinessProfile.findOne({ 
        _id: community.businessId, 
        ownerUserId: userId 
    });

    if(business) return { id: business._id, model: "BusinessProfile" };

    // Otherwise, they must be a normal user
    const userProfile = await UserProfile.findOne({ userId });
    if(!userProfile) throw new ApiError(404, "Please create a user profile first.");

    // Return user profile ID and model
    return { id: userProfile._id, model: "UserProfile" };
};

// Helper function to check if user is member of community
const checkCommunityMembership = async (communityId, profileId, profileModel) => {
    const membership = await CommunityMembership.findOne({
        communityId: communityId,
        memberId: profileId,
        memberModel: profileModel,
        status: "approved"
    });
    if(!membership) throw new ApiError(403, "You must be an approved member or owner of this community to perform this action.");
    
    return membership;
};

// Create Post in Community
const createPost = asyncHandler(async (request, response) => {
    const { error, value } = createPostSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Get community
    const community = await Community.findById(value.communityId);
    if(!community) throw new ApiError(404, "Community not found");

    const identity = await getIdentity(request.user._id, community._id);
    console.log(identity);

    // 2. Check Membership (Using your requested method)
    await checkCommunityMembership(community._id, identity.id, identity.model);

    // Create post
    const post = await CommunityPost.create({
        ...value,
        authorId: identity.id,
        authorModel: identity.model
    });

    if(!post) throw new ApiError(500, "Failed to create post");

    // Populate author details
    if (identity.model === "BusinessProfile") {
        await post.populate({ path: "authorId", model: "BusinessProfile", select: "companyName logo" });
    } else {
        await post.populate({ path: "authorId", model: "UserProfile", select: "fullName title logo" });
    }
    //await post.populate("authorUserProfileId", "fullName title logo");

    const io = request.app.get("io");
    io.to(value.communityId.toString()).emit("new_post", post); 

    // Response
    return response.status(201).json(new ApiResponse(201, post, "Post created successfully"));
});

// Get All Posts in Community (with pagination)
const getCommunityPosts = asyncHandler(async (request, response) => {
    const { id } = request.params; // communityId
    const { page = 1, limit = 20 } = request.query;

    // Get community
    const community = await Community.findById(id).populate("businessId");
    if(!community) throw new ApiError(404, "Community not found");

    // Check if user is member (for private communities)
    let hasAccess = community.type === "public";
    let currentUserProfileId = null;
    let isMember = false;
    if(request.user?._id) {
        const isBusinessOwner = community.businessId.ownerUserId.toString() === request.user._id.toString();
        if (isBusinessOwner) {
            hasAccess = true;
        } else {
            try {
                const userProfileId = await getUserProfileId(request.user._id);
                const membership = await CommunityMembership.findOne({
                    communityId: id,
                    userProfileId: userProfileId,
                    status: "approved"
                });
                if(membership) isMember =  hasAccess = true;
            } catch(err) {
                // User not logged in or no profile
            }
        }
    }

    // For private communities, only members can see posts
    if(community.type === "private" && !hasAccess && community.type !== "public") {
        throw new ApiError(403, "You must be a member to view posts in this community");
    }

    // Pagination
    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Get total count
    const totalPosts = await CommunityPost.countDocuments({ communityId: id });
    const totalPages = Math.ceil(totalPosts / limitNumber);

    // Get posts
    const posts = await CommunityPost.find({ communityId: id })
        .populate("authorId", "fullName logo companyName logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber).lean();

    // Check if user liked each post
    if(currentUserProfileId) {
        try {
            // const userProfileId = await getUserProfileId(request.user._id);
            for(let post of posts) {
                post.likedByUser = post.likes.some(
                    like =>  like.userProfileId && like.userProfileId.toString() === currentUserProfileId.toString()
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
        .populate("authorUserProfileId", "fullName title logo bio")
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
    // const userProfileId = await getUserProfileId(request.user._id);
    const identity = await getIdentity(request.user._id, post.communityId);

    // Check if user is the author
    if (post.authorId.toString() !== identity.id.toString()) {
        throw new ApiError(403, "Only the author can update this post");
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
        .populate("authorId", "companyName logo fullName title logo");

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
    const identity = await getIdentity(request.user._id, post.communityId);

    // Check if author OR Community Admin
    const isAuthor = post.authorId.toString() === identity.id.toString();
    
    const membership = await CommunityMembership.findOne({
        communityId: post.communityId,
        memberId: identity.id,
        role: { $in: ["owner", "admin", "moderator"] }
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

    const identity = await getIdentity(request.user._id, post.communityId);
    await checkCommunityMembership(post.communityId, identity.id, identity.model);

    // Check existing like
    const existingLikeIndex = post.likes.findIndex(like => like.userId.toString() === identity.id.toString());

    if(existingLikeIndex > -1) {
        // Unlike: Remove like
        post.likes.splice(existingLikeIndex, 1);
        post.likeCount = Math.max(0, post.likeCount - 1);
    } else {
        // Like: Add like
        post.likes.push({ authorId:identity.id, onModel:identity.model });
        post.likeCount += 1;
    }

    await post.save();

    const io = request.app.get("io");
    io.to(post.communityId.toString()).emit("post_updated", {
        postId: post._id,
        likeCount: post.likeCount,
        action: "like"
    });

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
    const identity = await getIdentity(request.user._id, post.communityId);


    // Check if user is member of the community
    await checkCommunityMembership(post.communityId, identity.id, identity.model);

    // Add comment
    post.comments.push({
        userId: identity.id,
        onModel: identity.model,
        content: value.content,
        commentedAt: new Date()
    });

    post.commentCount += 1;
    await post.save();

    // Populate latest comment properly
    await post.populate({
        path: `comments.${post.comments.length - 1}.userId`,
        select: "companyName logo fullName logo"
    });

    // Get latest populated comment
    const latestComment = post.comments[post.comments.length - 1];

    // Socket Emit
    const io = request.app.get("io");
    io.to(post.communityId.toString()).emit("new_comment", {
        postId: post._id,
        comment: latestComment,
        commentCount: post.commentCount
    });

    // Response
    return response.status(201).json(new ApiResponse(201, { comment: latestComment, commentCount: post.commentCount }, "Comment added successfully"));
});

// Get Post Comments (with pagination)
const getPostComments = asyncHandler(async (request, response) => {
    const { postId } = request.params;
    if(!isValidObjectId(postId)) throw new ApiError(400, "Post ID is not a valid MongoDB ID");

    // Pagination options
    const { page = 1, limit = 20 } = request.query;

    // Parse pagination params
    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Fetch post with populated comments.userId
    const post = await CommunityPost.findById(postId).populate({ path: "comments.userId", select: "fullName title logo"}).select("comments");
    if(!post) throw new ApiError(404, "Post not found");

    // Reverse to get newest comments first without mutating DB
    const allComments = [...post.comments].reverse();
    const totalComments = allComments.length;
    const totalPages = Math.ceil(totalComments / limitNumber);

    // Slice comments for current page
    const comments = allComments.slice(skip, skip + limitNumber);

    // Pagination info
    const paginationInfo = {
        currentPage: pageNumber,
        totalPages: totalPages,
        totalComments: totalComments,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
        limit: limitNumber
    };

    // If no comments found
    if(!comments.length) return response.status(200)
    .json(new ApiResponse(200, { comments, pagination: paginationInfo }, "No comments found under this post"));    

    // Response
    return response.status(200).json(new ApiResponse(200, { comments, pagination: paginationInfo }, "Comments fetched successfully"));
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
