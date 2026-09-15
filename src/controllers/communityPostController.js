const CommunityPost = require("../models/communityPostModel");
const Community = require("../models/communityModel");
const CommunityMembership = require("../models/communityMembership");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createPostSchema } = require("../validations/communityPostValidator");
const BusinessProfile = require("../models/businessProfileSchema");
const { isValidObjectId } = require("mongoose");
const sendNotification = require("../utils/sendNotification");
const convertToMongoId = require("../utils/convertToMongoId");
const { emptyList } = require("../constants");

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

    // 2. Check Membership (Using your requested method)
    await checkCommunityMembership(community._id, String(identity.id), identity.model);

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
    io.to(value.communityId).emit("new_post", post); 

    // Response
    return response.status(201).json(new ApiResponse(201, post, "Post created successfully"));
});

// Get All Posts in Community (with pagination)
const getCommunityPosts = asyncHandler(async (request, response) => {
    const { communityId } = request.params;
    const { page = 1, limit = 20 } = request.query;

    // Sanitize ID
    if(!isValidObjectId(communityId)) throw new ApiError(400, "Invalid Community ID");
    
    // Get Profile IDs & metadata
    const { _id: userId, role } = request.user;
    const { userProfileId, businessProfileId } = request.user.profiles || {}; 

    // Set dynamic member ID and model
    const memberId = role === "user" ? convertToMongoId(userProfileId) : convertToMongoId(businessProfileId);
    const memberModel = role === "user" ? "UserProfile" : "BusinessProfile";    

    // Get community
    const community = await Community.findById(communityId);
    if(!community) throw new ApiError(404, "Community not found");

    // Check membership
    const membership = await CommunityMembership.findOne({ 
        communityId, 
        memberId,
        memberModel,
        status: "approved"
    });
    if(!membership) throw new ApiError(403, "You must be a member to view posts in this community");

    // Get posts
    const posts = await CommunityPost.aggregatePaginate([
        // Match
        { $match: { communityId: convertToMongoId(communityId) } },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "authorId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline:[{ $project: { _id: 0, name: "$ownerName", logo: 1 } }]
            }
        },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "authorId",
                foreignField: "_id",
                as: "userProfile",
                pipeline:[{ $project: { _id: 0, name: "$fullName", logo: 1 } }]
            }
        },   
        
        // Lookup post likes
        {
            $lookup: {
                from: "postlikes",
                localField: "_id",
                foreignField: "postId",
                as: "postLikes"
            }
        }, 
        
        // Lookup post comments
        {
            $lookup: {
                from: "postcomments",
                localField: "_id",
                foreignField: "postId",
                as: "postComments"
            }
        },        
        
        // Lookup membership
        {
            $lookup: {
                from: "communitymemberships",
                let: {
                    authorId: "$authorId",
                    authorModel: "$authorModel",
                    communityId: "$communityId"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$memberId", "$$authorId"] },
                                    { $eq: ["$memberModel", "$$authorModel"] },
                                    { $eq: ["$communityId", "$$communityId"] }
                                ]
                            }
                        }
                    },
                    { $project: { _id: 0, role: 1 } }
                ],
                as: "memberInfo"
            }
        },     

        // Unwind
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$memberInfo", preserveNullAndEmptyArrays: true } },

        // Add field to determine if post liked by user
        {
            $addFields: {
                hasLiked: { $in: [memberId, "$postLikes.likerId"] },
                isAuthor: { $eq: ["$authorId", memberId] }
            }
        },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        {
            $project: {
                type: 1,
                likesCount: { $size: "$postLikes" },
                commentsCount: { $size: "$postComments" },
                hasLiked: 1,
                isAuthor: 1,
                content: 1,
                memberRole: "$memberInfo.role", 
                postedBy: {
                    $cond: [
                        { $eq: ["$authorModel", "UserProfile"] },
                        "$userProfile",
                        "$businessProfile"
                    ]
                },
                file: 1,               
                event: {
                    $cond: [
                        { $eq: ["$type", "event"] },
                        "$event",
                        "$$REMOVE"
                    ]                     
                },
                poll: {
                    $cond: [
                        { $eq: ["$type", "poll"] },
                        "$poll",
                        "$$REMOVE"
                    ]                  
                },
                images: 1,
                createdAt: 1             
            }
        }
    ], { page, limit });
    if(!posts.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No posts found"));

    // Response
    return response.status(200).json(new ApiResponse(200, posts, "Posts have been fetched"));
});

const getPostById = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { postId } = request.params;
    if(!isValidObjectId(postId)) throw new ApiError(400, "Invalid Post ID");

    // Get Profile IDs & metadata
    const { _id: userId, role } = request.user;
    const { userProfileId, businessProfileId } = request.user.profiles || {}; 

    // Set dynamic member ID and model
    const memberId = role === "user" ? convertToMongoId(userProfileId) : convertToMongoId(businessProfileId);
    const memberModel = role === "user" ? "UserProfile" : "BusinessProfile";
    
    // Get post
    const post = await CommunityPost.findById(postId);
    if(!post) throw new ApiError(404, "Post not found");

    // Check membership
    const membership = await CommunityMembership.findOne({ 
        communityId: post.communityId, 
        memberId,
        memberModel,
        status: "approved"
    });
    if(!membership) throw new ApiError(403, "You must be a member to view posts in this community");

    // Fetch
    const [postData] = await CommunityPost.aggregate([
        // Match
        { $match: { _id: convertToMongoId(postId) } },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "authorId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline:[{ $project: { _id: 0, name: "$ownerName", logo: 1 } }]
            }
        },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "authorId",
                foreignField: "_id",
                as: "userProfile",
                pipeline:[{ $project: { _id: 0, name: "$fullName", logo: 1 } }]
            }
        },  
        
        // Lookup post likes
        {
            $lookup: {
                from: "postlikes",
                localField: "_id",
                foreignField: "postId",
                as: "postLikes"
            }
        }, 
        
        // Lookup post comments
        {
            $lookup: {
                from: "postcomments",
                localField: "_id",
                foreignField: "postId",
                as: "postComments"
            }
        },        
        
        // Lookup membership
        {
            $lookup: {
                from: "communitymemberships",
                let: {
                    authorId: "$authorId",
                    authorModel: "$authorModel",
                    communityId: "$communityId"
                },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$memberId", "$$authorId"] },
                                    { $eq: ["$memberModel", "$$authorModel"] },
                                    { $eq: ["$communityId", "$$communityId"] }
                                ]
                            }
                        }
                    },
                    { $project: { _id: 0, role: 1 } }
                ],
                as: "memberInfo"
            }
        },          

        // Unwind
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: true } },  
        { $unwind: { path: "$memberInfo", preserveNullAndEmptyArrays: true } },

        // Add field to determine if post liked by user
        {
            $addFields: {
                hasLiked: { $in: [memberId, "$postLikes.likerId"] }
            }
        },        
        
        // Projection
        {
            $project: {
                type: 1,
                likesCount: { $size: "$postLikes" },
                commentsCount: { $size: "$postComments" },
                hasLiked: 1,
                content: 1,
                memberRole: "$memberInfo.role", 
                postedBy:{
                    $cond: [
                        { $eq: ["$authorModel", "UserProfile"] },
                        "$userProfile",
                        "$businessProfile"
                    ]
                },
                file: 1,
                event: {
                    $cond: [
                        { $eq: ["$type", "event"] },
                        "$event",
                        "$$REMOVE"
                    ]                     
                },
                poll: {
                    $cond: [
                        { $eq: ["$type", "poll"] },
                        "$poll",
                        "$$REMOVE"
                    ]                      
                },
                images: 1,
                createdAt: 1
            }
        }        
    ]);
    if(!postData) throw new ApiError(404, "Post not found");

    // Response
    return response.status(200).json(new ApiResponse(200, postData, "Post has been fetched"));
});

// Delete Post
const deletePost = asyncHandler(async (request, response) => {
    const { userProfileId, businessProfileId } = request.user.profiles || {};
    const { postId } = request.params;

    // Get post
    const post = await CommunityPost.findById(postId);
    if(!post) throw new ApiError(404, "Post not found");

    let isAllowed = false;
    if(String(userProfileId) === String(post.authorId) || String(businessProfileId) === String(post.authorId))
    {
        isAllowed = true;
    }  

    // // Get user profile
    // const identity = await getIdentity(request.user._id, post.communityId);

    // // Check if author OR Community Admin
    // const isAuthor = post.authorId === identity.id;
    
    // // Find membership
    // const membership = await CommunityMembership.findOne({
    //     communityId: post.communityId,
    //     memberId: memberId,
    //     role: { $in: ["owner", "admin"] }
    // });

    // Check authorization
    if(!isAllowed) throw new ApiError(403, "Only post author or community admins can delete the post");

    // Delete post
    // await CommunityPost.findByIdAndDelete(postId);
    await post.deleteOne();

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Post deleted successfully"));
});

module.exports = { createPost, getCommunityPosts, getPostById, deletePost };