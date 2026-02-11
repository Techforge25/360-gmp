const { Router } = require("express");
const { removeMemberFromCommunity } = require("../controllers/coomunityMembershipController");
const { authentication } = require("../middlewares/auth");

// Router instance
const communityMembershipRouter = Router();

// All routes in this router require authentication
communityMembershipRouter.use(authentication);

// Remove member from community
communityMembershipRouter.route("/:communityId/members/:memberId")
.delete(removeMemberFromCommunity);

module.exports = communityMembershipRouter;