const { Router } = require("express");
const { adminAuthentication, adminAuthorization, grantAccessTo } = require("../../middlewares/adminAuth");
const { communityManagementInitiator, fetchCommunityStats } = require("../../controllers/admin/communityManagementController");

// Router instance
const communityManagementRouter = Router();

// Inject router level middleware
communityManagementRouter.use(adminAuthentication, grantAccessTo("Communities & Networking"));

// Initiator
communityManagementRouter.route("/init").get(communityManagementInitiator);

// Fetch community stats
communityManagementRouter.route("/stats").get(fetchCommunityStats);

module.exports = communityManagementRouter;