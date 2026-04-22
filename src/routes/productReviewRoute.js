const { Router } = require("express");
const { productReviewAccess, createProductReview, fetchProductReviews } = require("../controllers/productReviewController");
const { authentication, authorization } = require("../middlewares/auth");
const { hasProductPurchased } = require("../middlewares/productReview");

// Router instance
const productReviewRouter = Router();

// Product review access (Check if user purchased this product)
productReviewRouter.route("/access/:productId")
.get(authentication, authorization(["user"]), hasProductPurchased, productReviewAccess);

// Create product review
productReviewRouter.route("/:productId")
.post(authentication, authorization(["user"]), hasProductPurchased, createProductReview);

// Fetch product reviews
productReviewRouter.route("/:productId")
.get(authentication, authorization(["user"]), fetchProductReviews);

module.exports = productReviewRouter;