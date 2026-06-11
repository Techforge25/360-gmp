const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");
const { createProduct, fetchAllProducts, viewProduct, updateProduct, 
deleteProduct, fetchBusinessFeaturedProducts, setFeaturedProduct, fetchFeaturedProducts, 
fetchTopRankingProducts, fetchNewProducts, fetchFlashDeals, fetchRelatedProducts } = require("../controllers/productsController");

// Router instance
const productsRouter = Router();

// Create product / Fetch all products
productsRouter.route("/")
.post(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, createProduct)
.get(authentication, fetchAllProducts);

// Fetch featured products
productsRouter.route("/featured").get(authentication, fetchFeaturedProducts);

// Fetch business featured products
productsRouter.route("/business/:businessId/featured").get(authentication, fetchBusinessFeaturedProducts);

// Fetch top ranking products (top-selling) (Market place)
productsRouter.route("/top-ranking").get(authentication, fetchTopRankingProducts);

// Fetch new products (Latest porducts) (Market place)
productsRouter.route("/new").get(authentication, fetchNewProducts);

// Fetch flash deals (Top-deals products) (Market place)
productsRouter.route("/top-deals").get(authentication, fetchFlashDeals);

// View product / Update product / Delete product
productsRouter.route("/:productId")
.get(authentication, viewProduct)
.put(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, updateProduct)
.delete(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, deleteProduct);

// Set featured product
productsRouter.route("/:productId/featured")
.patch(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, setFeaturedProduct);

// Fetch related products
productsRouter.route("/:productId/related-products")
.get(authentication, fetchRelatedProducts);

module.exports = productsRouter;