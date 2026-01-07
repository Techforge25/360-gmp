const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const {
    createCommunity,
    getAllCommunities,
    getCommunityById,
    joinCommunity,
    approveMembership,
    getPendingRequests,
    getCommunityMembers,
    updateCommunity,
    deleteCommunity,
    leaveCommunity
} = require("../controllers/communityController");

// Router instance
const communityRouter = Router();

// Create community (business owner only)
communityRouter.route("/").post(authentication, createCommunity);

// Get all communities (with filters and pagination)
communityRouter.route("/").get(authentication, getAllCommunities);

// Get community by ID
communityRouter.route("/:id").get(authentication, getCommunityById);

// Update community (owner/admin only)
communityRouter.route("/:id").put(authentication, updateCommunity);

// Delete community (owner only)
communityRouter.route("/:id").delete(authentication, deleteCommunity);

// Join community
communityRouter.route("/:id/join").post(authentication, joinCommunity);

// Leave community
communityRouter.route("/:id/leave").post(authentication, leaveCommunity);

// Get pending join requests (owner/admin only)
communityRouter.route("/:id/pending-requests").get(authentication, getPendingRequests);

// Approve/Reject membership (owner/admin only)
communityRouter.route("/:id/approve-membership").post(authentication, approveMembership);

// Get community members
communityRouter.route("/:id/members").get(authentication, getCommunityMembers);

module.exports = communityRouter;
