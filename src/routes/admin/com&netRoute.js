const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { totalCommunities } = require("../../controllers/admin/com&netController");

// Router instance
const comAndNetRouter = Router();

// Count total communities
comAndNetRouter.route("/totalCommunities")
.get(adminAuthentication, totalCommunities);

module.exports = comAndNetRouter;