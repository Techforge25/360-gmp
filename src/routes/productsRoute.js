const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");
const { createProduct, fetchAllProducts, fetchBusinessProducts, viewProduct, updateProduct, deleteProduct } = require("../controllers/productsController");

// Router instance
const productsRouter = Router();

// Create product / Fetch all products
productsRouter.route("/")
.post(authentication, checkSubscription, checkBusinessAccess, createProduct)
.get(authentication, checkSubscription, fetchAllProducts);

// Fetch business products
productsRouter.route("/business").get(authentication, checkSubscription, fetchBusinessProducts);

// View product / Update product
productsRouter.route("/:productId")
.get(authentication, checkSubscription, viewProduct)
.put(authentication, checkSubscription, checkBusinessAccess, updateProduct)
.delete(authentication, checkSubscription, checkBusinessAccess, deleteProduct);

module.exports = productsRouter;