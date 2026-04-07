const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { checkSubscription } = require("../middlewares/checkSubscription");
const { updateCompanyIdentity } = require("../controllers/businessProfileSettingController");

// Route instance
const businessProfileSettingRouter = Router();

// Update company identity
businessProfileSettingRouter.route("/companyIdentity")
.patch(authentication, authorization(["business"]), checkSubscription, updateCompanyIdentity);

module.exports = businessProfileSettingRouter;