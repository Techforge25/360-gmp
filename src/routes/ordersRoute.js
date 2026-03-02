const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createOrder, verifyStripePaymentForOrders, completeOrder, updateOrderStatusBySeller, 
fetchAllUserOrders, fetchProcessingOrders, fetchInTransitOrders, fetchCompletedOrders, 
fetchCancelledOrders, viewOrder, createOrderWithWallet, cancelOrder, fetchAllBusinessOrders } = require("../controllers/ordersController");
const { checkSubscription, checkUserAccess } = require("../middlewares/checkSubscription");

// Router instance
const orderRouter = Router();

// Create order through stripe
orderRouter.route("/stripe")
.post(authentication, authorization(["user"]), checkSubscription, createOrder);

// Verify payment
orderRouter.route("/stripe/success")
.get(verifyStripePaymentForOrders);

// Create order through wallet
orderRouter.route("/wallet")
.post(authentication, authorization(["user"]), checkSubscription, checkUserAccess, createOrderWithWallet);

// Update order status by seller
orderRouter.route("/:orderId/status")
.patch(authentication, authorization(["business"]), updateOrderStatusBySeller);

// Complete order by buyer
orderRouter.route("/:orderId/complete")
.patch(authentication, authorization(["user"]), completeOrder);

// Cancel order by buyer
orderRouter.route("/:orderId/cancel")
.get(authentication, authorization(["user"]), cancelOrder);

// Fetch all order of the user
orderRouter.route("/user/all-orders")
.get(authentication, authorization(["user"]), fetchAllUserOrders);

// Fetch all orders of the business
orderRouter.route("/business/all-orders")
.get(authentication, authorization(["business"]), fetchAllBusinessOrders);

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