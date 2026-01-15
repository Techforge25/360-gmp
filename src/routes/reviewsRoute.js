const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createReview } = require("../controllers/reviewsController");

// Router instance
const reviewsRouter = Router();

// Create review
reviewsRouter.route("/order/:orderId").post(authentication, authorization("user"), createReview);

module.exports = reviewsRouter;