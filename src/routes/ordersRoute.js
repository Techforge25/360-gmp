const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createOrder, verifyStripePaymentForOrders, completeOrder, updateOrderStatusBySeller, fetchAllOrders } = require("../controllers/ordersController");
const { checkSubscription } = require("../middlewares/checkSubscription");

// Router instance
const orderRouter = Router();

// Create order through stripe
orderRouter.route("/stripe").post(authentication, authorization(["user"]), checkSubscription, createOrder);
orderRouter.route("/stripe/success").get(verifyStripePaymentForOrders);

// Complete order by buyer
orderRouter.route("/:orderId/complete").patch(authentication, completeOrder);

// Update order status by seller
orderRouter.route("/:orderId/status").patch(authentication, updateOrderStatusBySeller);

// Gets All Order of the user
orderRouter.route("/getAllUserOrder").get(authentication, fetchAllOrders);

module.exports = orderRouter;