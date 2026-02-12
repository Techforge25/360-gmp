const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createDispute } = require("../controllers/disputController");

// Router instance
const disputeRouter = Router();

disputeRouter.use(authentication);

// Create dispute
disputeRouter.route("/")
.post(authorization(["user"]), createDispute);

module.exports = disputeRouter;