const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { fetchMyProducts, topPerformingProducts } = require("../controllers/businessProfileManagementController");

// Router instance
const businessProfileManagementRouter = Router();

// Fetch my products
businessProfileManagementRouter.route("/my-products").get(authentication, fetchMyProducts);

// Fetch top performing products
businessProfileManagementRouter.route("/top-performing-products").get(authentication, topPerformingProducts);

module.exports = businessProfileManagementRouter;