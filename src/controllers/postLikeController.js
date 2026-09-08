const Community = require("../models/communityModel");
const CommunityMembership = require("../models/communityMembership");
const CommunityPost = require("../models/communityPostModel");
const PostLike = require("../models/postLikeModel");
const ApiResponse = require("../utils/ApiResponse");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const { emptyList } = require("../constants");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../utils/convertToMongoId");
const sendNotification = require("../utils/sendNotification");

// Like or unlike post
const likePost = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { postId } = request.params;
    if(!isValidObjectId(postId)) throw new ApiError(400, "Invalid Post ID");

    // Get profile role and IDs
    const { userProfileId, businessProfileId } = request.user.profiles || {};
    const { role } = request.user;

    // Set dynamic liker ID and model
    const likerId = role === "user" ? userProfileId : businessProfileId;
    const likerModel = role === "user" ? "UserProfile" : "BusinessProfile";

    // Fetch post
    const post = await CommunityPost.findById(postId).select("-_id communityId");
    if(!post) throw new ApiError(404, "Post not found");

    // Check if already liked
    const isLiked = await PostLike.exists({ postId, likerId, likerModel });

    // Authorize to like or unlike post
    const membership = await CommunityMembership.findOne({ 
        communityId: post.communityId, 
        memberId: likerId,
        memberModel: likerModel,
        status: "approved"
    });

    // Check membership
    if(!membership)
    {
        const message = isLiked 
        ? "To unlike this post, you need to be a member of this community"
        : "To like this post, you need to be a member of this community";
        throw new ApiError(403, message);
    }

    if(isLiked)
    {
        // Unlike
        const unlike = await PostLike.findOneAndDelete({ postId, likerId, likerModel });
        if(!unlike) throw new ApiError(500, "Failed to unlike post");
    }
    else
    {
        // Like
        const like = await PostLike.create({ postId, likerId, likerModel });
        if(!like) throw new ApiError(500, "Failed to like post");
    }

    // Fetch updated counts
    const likesCount = await PostLike.countDocuments({ postId });

    // Message
    const message = isLiked 
    ? "Post has been unliked" 
    : "Post has been liked";

    // Response
    return response.status(200).json(new ApiResponse(200, { likesCount }, message));
});

module.exports = { likePost };