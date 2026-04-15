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
const sendNotification = require("../utils/sendNotification");
const { isValidObjectId } = require("mongoose");
const CommunityPost = require("../models/communityPostModel");

// Helper function to get userProfileId from userId
const getUserProfileId = async (userId) => {
    const userProfile = await UserProfile.findOne({ userId });
    if(!userProfile) throw new ApiError(404, "User profile not found. Please create your profile first.");
    return userProfile._id;
};

// Create Community (only business owner)
const createCommunity = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    const { error, value } = createCommunitySchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Check if businessId exists
    const businessProfile = await BusinessProfile.findOne({ ownerUserId:userId }).lean();
    if(!businessProfile) throw new ApiError(404, "Business profile not found. Invalid business ID");
    
    // Verify that the user is the owner of the business
    if(businessProfile.ownerUserId.toString() !== userId.toString()) throw new ApiError(403, "Only business owner can create communities");

    // Create community
    const community = await Community.create({ ...value, businessId:businessProfile._id });
    if(!community) throw new ApiError(500, "Failed to create community");

    // Create membership for owner
    const membership = await CommunityMembership.create({
        communityId: community._id,
        memberId: businessProfile._id,
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

    return response.status(201).json(new ApiResponse(201, community, "Community created successfully"));
});

// Get All Communities (with pagination and filters)
const getAllCommunities = asyncHandler(async (request, response) => {
    const { businessId, type, status, category, page = 1, limit = 20, search = "", industry, region } = request.query;

    // Base filter
    const filter = {};

    // Searches
    if(search) filter.name = { $regex: search, $options: "i" };
    if(industry) filter.industry = { $regex:industry, $options:"i" };
    if(region) filter.region = { $regex:region, $options:"i" };
    if(businessId) filter.businessId = businessId;
    if(type) filter.type = type;
    if(status) filter.status = status;
    if(category) filter.category = category;

    // Get communities
    const communities = await Community.paginate(filter, { 
        page, limit, sort:{ createdAt:-1 }, select:"-purpose -rules -status -tags",
        populate: { path:"businessId", select:"companyName businessType primaryIndustry logo" }            
    });
    if(!communities.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Communites not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, communities, "Communities fetched successfully"));
});

// Get Community By ID
const getCommunityById = asyncHandler(async (request, response) => {
    const { id } = request.params;

    // Find community
    const community = await Community.findById(id)
    .populate("businessId", "companyName businessType primaryIndustry location logo banner website");
    if(!community) throw new ApiError(404, "Community not found");

    // Check if user is member (for private communities)
    let isMember = false;
    let membershipStatus = null;
    if(request.user?._id) 
    {
        const { businessProfileId, userProfileId } = request.user.profiles || {};
        const membership = await CommunityMembership.findOne({
            communityId: id,
            memberId: { $in:[userProfileId, businessProfileId] },
            status:"approved"
        });

        if(membership) 
        {
            isMember = true;
            membershipStatus = membership.status;
        }
    } 

    // const now = new Date();
    // const currentMonth = new Date(now);
    // currentMonth.setMonth(currentMonth.getMonth());

    // Post count
    const postCount = await CommunityPost.countDocuments({ communityId: id });

    // Response
    return response.status(200).json(new ApiResponse(200, { community, postCount, isMember, membershipStatus }, "Community fetched successfully"));
});

// Join Community
const joinCommunity = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};
    const { id } = request.params; // Community ID

    // Validate
    if(!userProfileId) throw new ApiError(404, "User profile not found! Please create your profile first.");

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

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

    // Update member count only if approved
    if(membershipStatus === "approved") 
    {
        community.memberCount += 1;
        await community.save();
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
            userProfileId:userProfileId,
            role:{ $in: ["owner", "admin", "moderator"] }
        });
        if(!userMembership) throw new ApiError(403, "Only community owner, admins and moderators can approve memberships");
    }

    // Find and update membership
    const membership = await CommunityMembership.findOneAndUpdate(
        { communityId:id, userProfileId:value.userProfileId },
        { status:value.status, joinedAt:value.status === "approved" ? new Date() : undefined },
        { new:true }
    );
    if(!membership) throw new ApiError(404, "Membership request not found");

    // Update member count
    if(value.status === "approved") community.memberCount += 1;
    await community.save();

    // Emit notification to user about approval/rejection
    const userProfile = await UserProfile.findById(value.userProfileId).select("userId").lean();
    if(userProfile) 
    {
        const notificationTitle = value.status === "approved" ? "Community Join Request Approved" : "Community Join Request Rejected";
        await sendNotification({ 
            userOwnerId: userProfile.userId, 
            title: notificationTitle, 
            content:`Your request to join the community "${community.name}" has been ${value.status}.`, 
            io: request.app.get("io") 
        });
    }

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
        status: "pending"
    })
        .populate("userProfileId", "fullName title logo")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNumber);

    const total = await CommunityMembership.countDocuments({
        communityId: id,
        status: "pending"
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
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Verify user is business owner or admin
    const businessProfile = await BusinessProfile.findById(community.businessId);
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
    )
        .populate("businessId", "companyName businessType primaryIndustry logo");

    return response.status(200).json(
        new ApiResponse(200, updatedCommunity, "Community updated successfully")
    );
});

// Delete Community
const deleteCommunity = asyncHandler(async (request, response) => {
    const { id } = request.params;

    // Get community
    const community = await Community.findById(id);
    if(!community) throw new ApiError(404, "Community not found");

    // Verify user is business owner
    const businessProfile = await BusinessProfile.findById(community.businessId);
    if(businessProfile.ownerUserId.toString() !== request.user._id.toString()) {
        throw new ApiError(403, "Only business owner can delete community");
    }

    // Delete all memberships
    await CommunityMembership.deleteMany({ communityId: id });

    // Delete community
    await Community.findByIdAndDelete(id);

    return response.status(200).json(
        new ApiResponse(200, null, "Community deleted successfully")
    );
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
            { industry: { $regex: k, $options: "i" } }
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