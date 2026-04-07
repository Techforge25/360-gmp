const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { checkSubscription } = require("../middlewares/checkSubscription");
const { updateCompanyIdentity, updateOperationsAndLogistics } = require("../controllers/businessProfileSettingController");

// Route instance
const businessProfileSettingRouter = Router();

// Update company identity
businessProfileSettingRouter.route("/companyIdentity")
.patch(authentication, authorization(["business"]), checkSubscription, updateCompanyIdentity);

// Update operations & logistics
businessProfileSettingRouter.route("/operationsAndLogistics")
.patch(authentication, authorization(["business"]), checkSubscription, updateOperationsAndLogistics);

module.exports = businessProfileSettingRouter;