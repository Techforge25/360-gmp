const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { fetchMyProducts } = require("../controllers/businessProfileManagementController");

// Router instance
const businessProfileManagementRouter = Router();

// Fetch my products
businessProfileManagementRouter.route("/my-products").get(authentication, fetchMyProducts);

module.exports = businessProfileManagementRouter;