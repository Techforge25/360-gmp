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
const PostComment = require("../models/postCommentModel");
const { postCommentValidator } = require("../validations/postCommentValidator");
const validate = require("../utils/validate");

// Create comment
const createComment = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { postId } = request.params;
    if(!isValidObjectId(postId)) throw new ApiError(400, "Invalid Post ID");

    // Get validated payload
    const { content } = validate(postCommentValidator, request.body) || {};    

    // Get profile role and IDs
    const { userProfileId, businessProfileId } = request.user.profiles || {};
    const { role } = request.user;

    // Set dynamic commenter ID and model
    const commenterId = role === "user" ? userProfileId : businessProfileId;
    const commenterModel = role === "user" ? "UserProfile" : "BusinessProfile";

    // Fetch post
    const post = await CommunityPost.findById(postId).select("-_id communityId");
    if(!post) throw new ApiError(404, "Post not found");

    // Authorize to comment
    const membership = await CommunityMembership.findOne({
        communityId: post.communityId, 
        memberId: commenterId,
        memberModel: commenterModel,
        status: "approved"
    });
    if(!membership) throw new ApiError(403, "To comment on this post, you need to be a member of this community");

    // Save to db
    const comment = await PostComment.create({ postId, commenterId, commenterModel, content });
    if(!comment) throw new ApiError(500, "Failed to create comment");

    // Populate commentor info
    await comment.populate({ path: "commenterId", select: "-_id logo fullName companyName" });

    // Payload
    const payload = {
        _id: comment._id,
        content: comment.content,
        commentedBy: {
            logo: comment.commenterId?.logo,
            name: comment.commenterId?.fullName || comment.commenterId?.companyName,
        },
        createdAt: comment.createdAt
    };

    // Response
    return response.status(201).json(new ApiResponse(201, payload, "Comment has been submitted"));
});

// Fetch comments
const fetchComments = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Sanitize ID
    const { postId } = request.params;
    if(!isValidObjectId(postId)) throw new ApiError(400, "Invalid Post ID");

    // Get profile role and IDs
    const { userProfileId, businessProfileId } = request.user.profiles || {};
    const { role } = request.user;

    // Fetch post
    const post = await CommunityPost.findById(postId).select("-_id communityId");
    if(!post) throw new ApiError(404, "Post not found");

    // Set dynamic member ID and model
    const memberId = role === "user" ? userProfileId : businessProfileId;
    const memberModel = role === "user" ? "UserProfile" : "BusinessProfile";    

    // Authorize to view comments
    const membership = await CommunityMembership.findOne({
        communityId: post.communityId,
        memberId,
        memberModel,
        status: "approved"
    });
    if(!membership) throw new ApiError(403, "To view comments on this post, you need to be a member of this community");

    // Fetch
    const comments = await PostComment.aggregatePaginate([
        // Match
        { $match: { postId: convertToMongoId(postId) } },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "commenterId",
                foreignField: "_id",
                as: "userProfile",
                pipeline: [{ $project: { _id: 0, name: "$fullName", logo: 1 } }]
            }
        },          

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "commenterId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline: [{ $project: { _id: 0, name: "$ownerName", logo: 1 } }]
            }
        },          
        
        // Unwind
        { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: true } }, 
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: true } },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        {
            $project: {
                content: 1,
                commentedBy: {
                    $cond: [
                        { $eq: ["$commenterModel", "UserProfile"] },
                        "$userProfile",
                        "$businessProfile"
                    ]
                },            
                createdAt: 1
            }
        }
    ], { page, limit });
    if(!comments.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No comments found"));

    // Response
    return response.status(200).json(new ApiResponse(200, comments, "Comments have been fetched"));
});

module.exports = { createComment, fetchComments };