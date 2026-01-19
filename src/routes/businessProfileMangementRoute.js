const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { fetchMyProducts, topPerformingProducts, 
updateMapURL, viewBusinessProfile, 
fetchViewCounts,
updateContactInfo} = require("../controllers/businessProfileManagementController");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");

// Router instance
const businessProfileManagementRouter = Router();

// Fetch my products
businessProfileManagementRouter.route("/my-products")
.get(authentication, authorization(["business"]), fetchMyProducts);

// Fetch top performing products
businessProfileManagementRouter.route("/top-performing-products")
.get(authentication, authorization(["business"]), topPerformingProducts);

// Update map URL
businessProfileManagementRouter.route("/map-url")
.patch(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, updateMapURL);

// View business profile
businessProfileManagementRouter.route("/view/:businessProfileId")
.get(authentication, authorization(["user", "business"]), viewBusinessProfile);

// Fetch view counts
businessProfileManagementRouter.route("/view-counts")
.get(authentication, authorization(["business"]), fetchViewCounts);

// Update contact information
businessProfileManagementRouter.route("/contact-info")
.patch(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, updateContactInfo);
module.exports = businessProfileManagementRouter;