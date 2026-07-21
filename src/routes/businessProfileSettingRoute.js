const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { checkSubscription } = require("../middlewares/checkSubscription");
const { fetchBusinessInfo, updateBusinessInfo } = require("../controllers/businessProfileSettingController");

// Route instance
const businessProfileSettingRouter = Router();

// Update company identity
businessProfileSettingRouter.route("/info")
.get(authentication, authorization(["business"]), checkSubscription, fetchBusinessInfo)
.patch(authentication, authorization(["business"]), checkSubscription, updateBusinessInfo);

module.exports = businessProfileSettingRouter;