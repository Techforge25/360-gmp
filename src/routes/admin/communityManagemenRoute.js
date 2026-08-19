const { Router } = require("express");
const { adminAuthentication, adminAuthorization, grantAccessTo } = require("../../middlewares/adminAuth");
const { communityManagementInitiator, fetchCommunityStats, fetchCommunities, 
viewCommunity, fetchCommunityMembers, fetchCommunityPosts } = require("../../controllers/admin/communityManagementController");

// Router instance
const communityManagementRouter = Router();

// Inject router level middleware
communityManagementRouter.use(adminAuthentication, grantAccessTo("Communities & Networking"));

// Initiator
communityManagementRouter.route("/init").get(communityManagementInitiator);

// Fetch community stats
communityManagementRouter.route("/stats").get(fetchCommunityStats);

// Fetch communities
communityManagementRouter.route("/").get(fetchCommunities);

// View community
communityManagementRouter.route("/:communityId").get(viewCommunity);

// Fetch community members
communityManagementRouter.route("/:communityId/members").get(fetchCommunityMembers);

// Fetch community posts
communityManagementRouter.route("/:communityId/posts").get(fetchCommunityPosts);

module.exports = communityManagementRouter;