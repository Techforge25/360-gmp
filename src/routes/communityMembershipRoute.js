const { Router } = require("express");
const { removeMemberFromCommunity, makeAdmin, demoteAdmin } = require("../controllers/coomunityMembershipController");
const { authentication } = require("../middlewares/auth");

// Router instance
const communityMembershipRouter = Router();

// All routes in this router require authentication
communityMembershipRouter.use(authentication);

// Remove member from community
communityMembershipRouter.route("/:communityId/members/:memberId/remove")
.delete(removeMemberFromCommunity);

// Make admin
communityMembershipRouter.route("/:communityId/members/:memberId/make-admin")
.patch(makeAdmin);

// Demote admin
communityMembershipRouter.route("/:communityId/members/:memberId/demote-admin")
.patch(demoteAdmin);

module.exports = communityMembershipRouter;