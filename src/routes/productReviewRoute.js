const { Router } = require("express");
const { productReviewAccess } = require("../controllers/productReviewController");
const { authentication, authorization } = require("../middlewares/auth");

// Router instance
const productReviewRouter = Router();

// Product review access (Check if user purchased this product)
productReviewRouter.route("/access/:productId")
.get(authentication, authorization(["user"]), productReviewAccess);

module.exports = productReviewRouter;