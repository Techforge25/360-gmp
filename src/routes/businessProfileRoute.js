const {Router} = require("express");
const { authentication } = require("../middlewares/auth");
const { createBusinessProfile, updateBusinessProfile, 
fetchBusinessProfiles, getDirection, 
fetchMyBusinessProfile} = require("../controllers/businessProfileController");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");

// Router instance
const businessProfileRouter = Router();

// Create business profile
businessProfileRouter.route("/")
.post(authentication, checkSubscription, checkBusinessAccess, createBusinessProfile);

// Fetch business profiles
businessProfileRouter.route("/")
.get(authentication, fetchBusinessProfiles);

// Fetch my business
businessProfileRouter.route("/me")
.get(authentication, fetchMyBusinessProfile);

// Update business profile
businessProfileRouter.route("/")
.put(authentication, checkSubscription, checkBusinessAccess, updateBusinessProfile);

// Get direction
businessProfileRouter.route("/:businessId/getDirection")
.get(authentication, checkSubscription, getDirection);

module.exports = businessProfileRouter;