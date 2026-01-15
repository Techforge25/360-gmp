const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createSocialLink, getSocialLinks, removeSocialLink } = require("../controllers/socialLinkController");

// Router instance
const socialLinkRouter = Router();

// Create social link
socialLinkRouter.route("/").post(authentication, authorization(["business"]), createSocialLink);

// Get social links
socialLinkRouter.route("/:businessProfileId").get(authentication, authorization(["business", "user"]), getSocialLinks);

// Remove social link
socialLinkRouter.route("/:socialLinkId").delete(authentication, authorization(["business"]), removeSocialLink);

module.exports = socialLinkRouter;