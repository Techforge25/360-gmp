const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createCommunity, getAllCommunities, getCommunityById, joinCommunity, approveMembership,
getPendingRequests, getCommunityMembers, updateCommunity, deleteCommunity, leaveCommunity, 
fetchSuggestedCommunities,  fetchMyCommunities } = require("../controllers/communityController");

// Router instance
const communityRouter = Router();

// Create community (business owner only)
communityRouter.route("/").post(authentication, authorization(["business"]), createCommunity);

// Get all communities (with filters and pagination)
communityRouter.route("/").get(authentication, getAllCommunities);

// Get community by ID
communityRouter.route("/:id").get(authentication, getCommunityById);

// Update community (owner/admin only)
communityRouter.route("/:communityId").put(authentication, updateCommunity);

// Delete community (owner only)
communityRouter.route("/:id").delete(authentication, authorization(["business"]), deleteCommunity);

// Join community
communityRouter.route("/:id/join").post(authentication, authorization(["user"]), joinCommunity);

// Leave community
communityRouter.route("/:id/leave").post(authentication, authorization(["user", "business"]), leaveCommunity);

// Get pending join requests (owner/admin only)
communityRouter.route("/:id/pending-requests").get(authentication, getPendingRequests);

// Approve/Reject membership (owner/admin only)
communityRouter.route("/:id/approve-membership").post(authentication, approveMembership);

// Get community members
communityRouter.route("/:id/members").get(authentication, getCommunityMembers);

// Get suggested communities
communityRouter.route("/suggestions/show").get(authentication, fetchSuggestedCommunities);

// My communities
communityRouter.route("/my-communities/show").get(authentication, fetchMyCommunities);

module.exports = communityRouter;