const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createOrder, verifyStripePaymentForOrders } = require("../controllers/ordersController");

// Router instance
const orderRouter = Router();

// Create order through stripe
orderRouter.route("/stripe").post(authentication, createOrder);
orderRouter.route("/stripe/success").get(verifyStripePaymentForOrders);

module.exports = orderRouter;