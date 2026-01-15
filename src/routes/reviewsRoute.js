const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createReview, fetchReviews } = require("../controllers/reviewsController");

// Router instance
const reviewsRouter = Router();

// Create review
reviewsRouter.route("/order/:orderId")
.post(authentication, authorization(["user"]), createReview)
.get(authentication, authorization(["user", "business"]), fetchReviews);

module.exports = reviewsRouter;