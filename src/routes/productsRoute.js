const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");
const { createProduct, fetchAllProducts, fetchBusinessProducts, viewProduct, updateProduct, deleteProduct, fetchBusinessFeaturedProducts, setFeaturedProduct, fetchMyProducts, fetchFeaturedProducts, fetchTopRankingProducts, fetchNewProducts } = require("../controllers/productsController");

// Router instance
const productsRouter = Router();

// Create product / Fetch all products
productsRouter.route("/")
.post(authentication, checkSubscription, checkBusinessAccess, createProduct)
.get(authentication, checkSubscription, fetchAllProducts);

// Fetch featured products
productsRouter.route("/featured").get(authentication, fetchFeaturedProducts);

// Fetch business products
productsRouter.route("/business/:businessId").get(authentication, checkSubscription, fetchBusinessProducts);

// Fetch business featured products
productsRouter.route("/business/:businessId/featured").get(authentication, checkSubscription, fetchBusinessFeaturedProducts);

// Fetch my products
productsRouter.route("/myProducts").get(authentication, authorization(["business"]), checkSubscription, fetchMyProducts);

// Fetch top ranking products (top-selling)
productsRouter.route("/top-ranking").get(authentication, fetchTopRankingProducts);

// Fetch new products (Latest porducts)
productsRouter.route("/new").get(authentication, fetchNewProducts);

// Fetch flash deals (Top-deals products)
productsRouter.route("/top-deals").get(authentication, fetchNewProducts);

// View product / Update product / Delete product
productsRouter.route("/:productId")
.get(authentication, checkSubscription, viewProduct)
.put(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, updateProduct)
.delete(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, deleteProduct);

// Set featured product
productsRouter.route("/:productId/featured")
.patch(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, setFeaturedProduct);

module.exports = productsRouter;