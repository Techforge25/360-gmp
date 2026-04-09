const {Router} = require("express");
const { authentication } = require("../middlewares/auth");
const { createBusinessProfile, updateBusinessProfile, 
fetchBusinessProfiles, getDirection, 
fetchMyBusinessProfile,
deleteMyBusinessProfile,
fetchLatestBusiness,
fetchBusinessCountries} = require("../controllers/businessProfileController");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");

// Router instance
const businessProfileRouter = Router();

// Create business profile
businessProfileRouter.route("/")
.post(authentication, checkSubscription, createBusinessProfile);

// Fetch business profiles
businessProfileRouter.route("/")
.get(authentication, fetchBusinessProfiles);

// Fetch my business
businessProfileRouter.route("/me")
.get(authentication, fetchMyBusinessProfile);

// Fetch business countries
businessProfileRouter.route("/countries")
.get(authentication, fetchBusinessCountries);

// Update business profile
businessProfileRouter.route("/")
.put(authentication, checkSubscription, checkBusinessAccess, updateBusinessProfile);

// Delete business profile
businessProfileRouter.route("/")
.delete(authentication, checkSubscription, checkBusinessAccess, deleteMyBusinessProfile);

// Get direction
businessProfileRouter.route("/:businessId/getDirection")
.get(authentication, checkSubscription, getDirection);

// Fetch latest business for market place
businessProfileRouter.route("/latest/marketplace")
.get(authentication, fetchLatestBusiness);

module.exports = businessProfileRouter;