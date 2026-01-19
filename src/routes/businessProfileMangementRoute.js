const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { fetchMyProducts, topPerformingProducts, updateMapURL } = require("../controllers/businessProfileManagementController");
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

module.exports = businessProfileManagementRouter;