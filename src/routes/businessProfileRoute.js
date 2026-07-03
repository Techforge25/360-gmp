const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createBusinessProfile, fetchBusinessProfiles, getDirection, 
fetchMyBusinessProfile, deleteMyBusinessProfile, fetchLatestBusiness, fetchBusinessCountries,
fetchBusinessJobs, fetchBusinessProducts, fetchBusinessCommunities } = require("../controllers/businessProfileController");
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

// Delete business profile
businessProfileRouter.route("/")
.delete(authentication, checkSubscription, checkBusinessAccess, deleteMyBusinessProfile);

// Get direction
businessProfileRouter.route("/:businessId/getDirection")
.get(authentication, checkSubscription, getDirection);

// Fetch latest business for market place
businessProfileRouter.route("/latest/marketplace")
.get(authentication, fetchLatestBusiness);

/******************** BUSINESS RESOURCES ********************/
// Products of a business
businessProfileRouter.route("/:businessId/products")
.get(authentication, fetchBusinessProducts);

// Jobs of a business
businessProfileRouter.route("/:businessId/jobs")
.get(authentication, fetchBusinessJobs);

// Communities of a business
businessProfileRouter.route("/:businessId/communities")
.get(authentication, fetchBusinessCommunities);

module.exports = businessProfileRouter;