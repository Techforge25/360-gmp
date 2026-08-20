const Community = require("../models/communityModel");
const CommunityMembership = require("../models/communityMembership");
const BusinessProfile = require("../models/businessProfileSchema");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createCommunitySchema, updateCommunitySchema, approveMembershipSchema } = require("../validations/communityValidator");
const { emptyList } = require("../constants");
const UserSearch = require("../models/userSearchesModel");
const { isValidObjectId } = require("mongoose");
const CommunityPost = require("../models/communityPostModel");
const convertToMongoId = require("../utils/convertToMongoId");
const sendNotification = require("../utils/sendNotification");

// Helper function to get userProfileId from userId
const getUserProfileId = async (userId) => {
    const userProfile = await UserProfile.findOne({ userId });
    if(!userProfile) throw new ApiError(404, "User profile not found. Please create your profile first.");
    return userProfile._id;
};

// Create Community (only business owner)
const createCommunity = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { businessProfileId } = request.user.profiles || {};

    const { error, value } = createCommunitySchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Create community
    const community = await Community.create({ ...value, businessId: businessProfileId });
    if(!community) throw new ApiError(500, "Failed to create community");

    // Create membership for owner
    const membership = await CommunityMembership.create({
        communityId: community._id,
        memberId: businessProfileId,
        memberModel: "BusinessProfile",
        role: "owner",
        status: "approved"
    });
    if(!membership) throw new ApiError(500, "Failed to create community membership");

    // Update member count
    community.memberCount = 1;
    await community.save();

    // Populate business details
    await community.populate("businessId", "companyName businessType primaryIndustry logo");

    // Send notification to business
    await sendNotification({
        userId,
        title: "Community Creation",
        content: "You have created a new community",
        type: "BusinessProfile",
        io: request.app.get("io")        
    });      

    // Response
    return response.status(201).json(new ApiResponse(201, community, "Community created successfully"));
});

// Get All Communities (with pagination and filters)
const getAllCommunities = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);
    const { businessId, type, status, category, page = 1, limit = 20, search = "", region } = request.query;

    // Base filter
    const filter = {};

    // Same parent profiles restriction
    // if(String(userId) === String(community.businessId.ownerUserId)) isOwnCommunity = true;

    // Searches
    if(search) filter.name = { $regex: search, $options: "i" };
    if(region) filter.region = { $regex:region, $options:"i" };
    if(businessId) filter.businessId = convertToMongoId(businessId);
    if(type) filter.type = type;
    if(status) filter.status = status;
    if(category) filter.category = category;

    // Aggregation
    const aggregation = Community.aggregate([
        // Match
        { $match: filter },

        // Lookup inside business profile
        {
            $lookup:{
                from: "businessprofiles",
                localField: "businessId",
                foreignField: "_id",
                as: "businessId",
                pipeline:[{ $project: { ownerUserId: 1, companyName: 1, businessType: 1, primaryIndustry: 1, logo: 1 } }]
            }
        },

        { $unwind:"$businessId" },

        // Add a key to determine own community
        {
            $addFields:{
                isOwnCommunity: { $eq:["$businessId.ownerUserId", userId] }
            }
        },

        // Projection
        { 
            $project: { 
                purpose:0, 
                rules:0, 
                status:0, 
                tags:0,
            } 
        },

        // Sort
        { $sort:{ createdAt:-1 } }
    ]);

    // Execute query
    const communities = await Community.aggregatePaginate(aggregation, { page, limit });
    if(!communities.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Communites not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, communities, "Communities fetched successfully"));
});

// Get Community By ID
const getCommunityById = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { id } = request.params;

    // Find community
    const community = await Community.findById(id)
    .populate("businessId", "_id ownerUserId companyName businessType primaryIndustry location logo banner website")
    .lean();
    if(!community) throw new ApiError(404, "Community not found");

    // Check if user is member (for private communities)
    let isOwnCommunity = false;
    let isMember = false;
    let membershipStatus = null;

    // Get profile IDs
    const { businessProfileId, userProfileId } = request.user.profiles || {};  
    
    // Same parent profiles restriction
    if(String(userId) === String(community.businessId.ownerUserId)) isOwnCommunity = true;

    // Find membership
    const membership = await CommunityMembership.findOne({
        communityId: id,
        memberId: { $in:[userProfileId, businessProfileId] },
        status: "approved"
    });

    if(membership) 
    {
        isMember = true;
        membershipStatus = membership.status;
    }

    // Post count of current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const postCount = await CommunityPost.countDocuments({ 
        communityId: id, 
        createdAt:{ $gte:startOfMonth, $lte:endOfMonth } 
    });

    // Replace actual member count to exclude owner
    // const memberCount = Number(community.memberCount) - 1;
    // delete community.memberCount;

    // Prepare payload
    const payload = { 
        // community: { ...community, memberCount } , 
        community, 
        postCount, 
        isMember, 
        membershipStatus, 
        isOwnCommunity 
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Community fetched successfully"));
});

// Join Community
const joinCommunity = asyncHandler(async (request, response) => {
    const { userProfileId, businessProfileId } = request.user.profiles || {};
    const { id } = request.params; // Community ID

    // Validate
    if(!userProfileId) throw new ApiError(404, "User profile not found! Please create your profile first.");

    // Get community
    const community = await Community.findById(id)
    .populate({ path:"businessId", select:"ownerUserId" });
    if(!community) throw new ApiError(404, "Community not found");

    // Same parent restriction
    if(businessProfileId && String(businessProfileId) === String(community.businessId._id))
    {
        throw new ApiError(403, "You cannot join your own community");
    }

    // Check if already a member
    const existingMembership = await CommunityMembership.findOne({ communityId:id, memberId: userProfileId });
    if(existingMembership) 
    {
        if(existingMembership.status === "approved") throw new ApiError(400, "You are already a member of this community");
        if(existingMembership.status === "pending") throw new ApiError(400, "Your join request is pending approval");
        if(existingMembership.status === "rejected") throw new ApiError(400, "Your join request was rejected");
    }

    // Handle different community types
    let membershipStatus = "approved";
    let isPaid = false;

    if(community.type === "private") membershipStatus = "pending";
    if(community.type === "featured") 
    {
        // Check if user has subscription/paid access
        // For now, set as pending - business owner will approve after payment verification
        membershipStatus = "pending";
        isPaid = true;
    }
    // public communities: status = "approved" (default)

    // Create membership
    const membership = await CommunityMembership.create({
        communityId: id,
        memberId: userProfileId,
        memberModel: "UserProfile",
        role: "member",
        status: membershipStatus,
        isPaid: isPaid
    });

    // Pending case
    if(membershipStatus === "pending") 
    {
        const userProfile = await UserProfile.findById(userProfileId).select("fullName").lean();

        // Send notification to business
        await sendNotification({
            userId: community.businessId.ownerUserId,
            title: "New Joining Request",
            content: `${userProfile?.fullName} wants to join your community ${community?.name}`,
            type: "BusinessProfile",
            io: request.app.get("io")        
        });
    }    

    // Update member count only if approved
    if(membershipStatus === "approved") 
    {
        community.memberCount += 1;
        await community.save();

        const userProfile = await UserProfile.findById(userProfileId).select("fullName").lean();

        // Send notification to business
        await sendNotification({
            userId: community.businessId.ownerUserId,
            title: "New User Joined",
            content: `${userProfile?.fullName} has joined your community ${community?.name}`,
            type: "BusinessProfile",
            io: request.app.get("io")        
        });
    }

    // Response message based on community joining behaviour
    const responseMessage = membershipStatus === "approved" 
    ? `Successfully joined ${community.name}` 
    : `Join request sent to ${community.name}. Waiting for approval`;

    // Response
    return response.status(201).json(new ApiResponse(201, membership, responseMessage));
});

// Approve/Reject Membership (for private/featured communities)
const approveMembership = asyncHandler(async (request, response) => {
    const { id } = request.params; // communityId
    const { error, value } = approveMembershipSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Find community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Verify user is business owner or admin
    const businessProfile = await BusinessProfile.findById(community.businessId);
    if(String(businessProfile.ownerUserId) !== String(request.user._id)) 
    {
        // Check if user is admin/moderator of the community
        const userProfileId = await getUserProfileId(request.user._id);
        const userMembership = await CommunityMembership.findOne({
            communityId:id,
            memberId:userProfileId,
            role:{ $in: ["owner", "admin", "moderator"] }
        });
        if(!userMembership) throw new ApiError(403, "Only community owner, admins and moderators can approve memberships");
    }

    // Find and update membership
    const membership = await CommunityMembership.findOneAndUpdate(
        { communityId:id, memberId:value.userProfileId },
        { status:value.status, joinedAt:value.status === "approved" ? new Date() : undefined },
        { new:true }
    );
    if(!membership) throw new ApiError(404, "Membership request not found");


    // Emit notification to user about approval/rejection
    const userProfile = await UserProfile.findById(value.userProfileId).select("userId").lean();

    // If approved
    if(value.status === "approved")
    {
        community.memberCount += 1;

        // Send notification to user
        await sendNotification({ 
            userId: userProfile?.userId,
            title: "Community Joining Request", 
            content: `Your request for joining ${community.name} has been approved by the admin`, 
            type: "UserProfile",
            io: request.app.get("io") 
        });            
    }

    // If rejected
    if(value.status === "rejected")
    {
        // Send notification to user
        await sendNotification({ 
            userId: userProfile?.userId,
            title: "Community Joining Request", 
            content: `Your request for joining ${community.name} has been rejected by the admin`, 
            type: "UserProfile",
            io: request.app.get("io") 
        });            
    }

    // Save
    await community.save();    

    // Response
    return response.status(200).json(new ApiResponse(200, membership, `Membership ${value.status} successfully`));
});

// Get Pending Join Requests (for private/featured communities)
const getPendingRequests = asyncHandler(async (request, response) => {
    const { id } = request.params; // communityId
    const { page = 1, limit = 20 } = request.query;

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Verify user is business owner or admin
    const businessProfile = await BusinessProfile.findById(community.businessId);
    if(businessProfile.ownerUserId.toString() !== request.user._id.toString()) {
        const userProfileId = await getUserProfileId(request.user._id);
        const userMembership = await CommunityMembership.findOne({
            communityId: id,
            userProfileId: userProfileId,
            role: { $in: ["owner", "admin", "moderator"] }
        });
        if(!userMembership) {
            throw new ApiError(403, "Only community owner/admins can view pending requests");
        }
    }

    // Pagination
    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Get pending memberships
    const pendingMemberships = await CommunityMembership.find({
        communityId: id,
        status: "pending",
        role: { $in:["member"] }
    }).populate("memberId", "fullName title logo")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNumber);

    const total = await CommunityMembership.countDocuments({
        communityId: id,
        status: "pending",
        role: { $in:["member"] }
    });

    return response.status(200).json(
        new ApiResponse(200, { pendingRequests: pendingMemberships, total }, "Pending requests fetched successfully")
    );
});

// Get Community Members
const getCommunityMembers = asyncHandler(async (request, response) => {
    const { id } = request.params; // communityId
    const { page = 1, limit = 20, role, status } = request.query;

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Pagination
    const pageNumber = Number.parseInt(page, 10);
    const limitNumber = Number.parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    const filter = { communityId: id, status: "approved", role:{ $in:["member", "admin"] } };
    if(role) filter.role = role;
    if(status) filter.status = status;

    // Get members
    const members = await CommunityMembership.find(filter)
    .populate("memberId", "fullName title logo bio")
    .sort({ joinedAt: -1 })
    .skip(skip)
    .limit(limitNumber);

    const total = await CommunityMembership.countDocuments(filter);

    return response.status(200).json(
        new ApiResponse(200, { members, total }, "Community members fetched successfully")
    );
});

// Update Community
const updateCommunity = asyncHandler(async (request, response) => {
    const { id } = request.params;

    const { error, value } = updateCommunitySchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Get community
    const community = await Community.findById(id)
    .populate({ path:"businessId", select:"ownerUserId" });
    if(!community) throw new ApiError(404, "Community not found");

    // Verify user is business owner or admin
    const businessProfile = await BusinessProfile.findById(community.businessId._id);
    if(businessProfile.ownerUserId.toString() !== request.user._id.toString()) {
        const userProfileId = await getUserProfileId(request.user._id);
        const userMembership = await CommunityMembership.findOne({
            communityId: id,
            userProfileId: userProfileId,
            role: { $in: ["owner", "admin"] }
        });
        if(!userMembership) {
            throw new ApiError(403, "Only community owner/admins can update community");
        }
    }

    // Update community
    const updatedCommunity = await Community.findByIdAndUpdate(
        id,
        { $set: value },
        { new: true, runValidators: true }
    ).populate("businessId", "companyName businessType primaryIndustry logo");

    // Send notification to business
    await sendNotification({
        userId: community.businessId.ownerUserId,
        title: "Community Updated",
        content: "Your community settings has been updated",
        type: "BusinessProfile",
        io: request.app.get("io")        
    });      

    // Response
    return response.status(200).json(new ApiResponse(200, updatedCommunity, "Community updated successfully"));
});

// Delete Community
const deleteCommunity = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { businessProfileId } = request.user.profiles || {};
    const { id } = request.params;

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Verify user is business owner
    if(String(businessProfileId) !== String(community.businessId)) throw new ApiError(403, "Only business owner can delete the community");

    // Delete all memberships
    await CommunityMembership.deleteMany({ communityId: id });

    // Delete community
    await Community.findByIdAndDelete(id);

    // Send notification to business
    await sendNotification({
        userId,
        title: "Community Deletion",
        content: "Your community has been deleted",
        type: "BusinessProfile",
        io: request.app.get("io")        
    });      

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Community deleted successfully"));
});

// Leave Community
const leaveCommunity = asyncHandler(async (request, response) => {
    const { id } = request.params; // communityId
    const { role } = request.user;
    const { userProfileId, businessProfileId } = request.user.profiles || {};

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    let memberId = null;
    if(role === "user") memberId = userProfileId;
    if(role === "business") memberId = businessProfileId;
    if(!memberId) throw new ApiError(400, "Member ID is missing");

    // Find and remove membership
    const membership = await CommunityMembership.findOneAndDelete({ communityId:id, memberId });
    if(!membership) throw new ApiError(404, "You are not a member of this community");

    // Update member count
    if(membership.status === "approved") {
        community.memberCount = Math.max(0, community.memberCount - 1);
        await community.save();
    }

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Left community successfully"));
});

// Fetch suggested communities
const fetchSuggestedCommunities = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get recent searches
    const searches = await UserSearch.find({ userId }).sort({ createdAt:-1 }).limit(10).lean();

    // Get keywords
    const keywords = searches.map(s => s.searchedContent);
    if (!keywords.length) return response.status(200).json(new ApiResponse(200, [], "No suggested communities found"));
    
    // Get user's profile
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) return response.status(200).json(new ApiResponse(200, [], "No suggested communities found"));
    
    // Get joined communities
    const memberships = await CommunityMembership.find({ userProfileId:userProfile._id, status:"approved" }).select("communityId").lean();

    // Capture joined communities ids
    const joinedCommunityIds = memberships.map(m => m.communityId);

    // Build regex conditions
    const orConditions = [];
    keywords.forEach(k => {
        orConditions.push(
            { name: { $regex: k, $options: "i" } },
            { category: { $regex: k, $options: "i" } },
            { tags: { $regex: k, $options: "i" } },
            { description: { $regex: k, $options: "i" } },
        );
    });

    // Fetch suggestions
    const communities = await Community.find({ status:"active", _id:{ $nin:joinedCommunityIds }, $or:orConditions })
    .sort({ memberCount:-1 }).limit(5).select("name profileImage memberCount type").lean();
    if(!communities.length) return response.status(200).json(new ApiResponse(200, [], "No suggested communities found"));

    // Response  
    return response.status(200).json(new ApiResponse(200, communities, "Suggested communities have been fetched"));
});

// Fetch my communities
const fetchMyCommunities = asyncHandler(async (request, response) => {
    const { userProfileId, businessProfileId } = request.user.profiles || {}; 

    // Validate role
    const { role } = request.user;
    if(!["user", "business"].includes(role)) throw new ApiError(400, "Invalid role");

    // Intialize member ID
    let memberId = null;
    if(role === "user")
    {
        if(!userProfileId) throw new ApiError(400, "User profile ID is mising");
        memberId = userProfileId;
    }

    if(role === "business") 
    {
        if(!businessProfileId) throw new ApiError(400, "Business profile ID is mising");
        memberId = businessProfileId;
    }

    // Get memberships for both user and business profiles
    const memberships = await CommunityMembership.find({ 
        memberId,
        status: "approved"
    }).populate("communityId", "name profileImage memberCount type status").lean();

    // Extract communities
    const communities = memberships.map(m => m.communityId);
    if(!communities.length) return response.status(200).json(new ApiResponse(200, [], `No communities found for ${role} profile`));

    // Response
    return response.status(200).json(new ApiResponse(200, communities, "Communities fetched successfully"));
});

module.exports = { createCommunity, getAllCommunities, getCommunityById, 
joinCommunity, approveMembership, getPendingRequests, getCommunityMembers, 
updateCommunity, deleteCommunity, leaveCommunity, fetchSuggestedCommunities, 
fetchMyCommunities };