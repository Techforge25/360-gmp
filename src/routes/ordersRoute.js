const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createOrder, verifyStripePaymentForOrders, completeOrder, updateOrderStatusBySeller, 
fetchAllOrders, fetchProcessingOrders, fetchInTransitOrders, fetchCompletedOrders, 
fetchCancelledOrders, 
viewOrder} = require("../controllers/ordersController");
const { checkSubscription } = require("../middlewares/checkSubscription");

// Router instance
const orderRouter = Router();

// Create order through stripe
orderRouter.route("/stripe")
.post(authentication, authorization(["user"]), checkSubscription, createOrder);

// Verify payment
orderRouter.route("/stripe/success")
.get(verifyStripePaymentForOrders);

// Complete order by buyer
orderRouter.route("/:orderId/complete")
.patch(authentication, completeOrder);

// Update order status by seller
orderRouter.route("/:orderId/status")
.patch(authentication, updateOrderStatusBySeller);

// Gets All Order of the user
orderRouter.route("/user/all-orders")
.get(authentication, authorization(["user"]), fetchAllOrders);

// Fetch processing orders
orderRouter.route("/user/processing-orders")
.get(authentication, authorization(["user"]), fetchProcessingOrders);

// Fetch in-transit orders
orderRouter.route("/user/in-transit-orders")
.get(authentication, authorization(["user"]), fetchInTransitOrders);

// Fetch completed orders
orderRouter.route("/user/completed-orders")
.get(authentication, authorization(["user"]), fetchCompletedOrders);

// Fetch cancelled orders
orderRouter.route("/user/cancelled-orders")
.get(authentication, authorization(["user"]), fetchCancelledOrders);

// View order
orderRouter.route("/:orderId/view")
.get(authentication, viewOrder);

module.exports = orderRouter;