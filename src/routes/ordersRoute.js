const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createOrder, verifyStripePaymentForOrders, completeOrder, updateOrderStatusBySeller, 
fetchAllUserOrders, fetchProcessingOrders, fetchInTransitOrders, fetchCompletedOrders, 
fetchCancelledOrders, viewOrder, createOrderWithWallet, cancelOrder, fetchAllBusinessOrders, 
fetchBusinessProcessingOrders, fetchBsuinessInTransitOrders, fetchBusinessCompletedOrders,
fetchBusinessCancelledOrders, updateOrderTrackingInfo, fetchNewOrders, fetchBusinessNewOrders, 
fetchDeliveredOrders, fetchBusinessDeliveredOrders, fetchUnreviewedProducts } = require("../controllers/ordersController");
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

// Update order tracking info by seller
orderRouter.route("/:orderId/trackingInfo")
.patch(authentication, authorization(["business"]), updateOrderTrackingInfo);

// Update order status by seller
orderRouter.route("/:orderId/status")
.patch(authentication, authorization(["business"]), updateOrderStatusBySeller);

// Complete order by buyer
orderRouter.route("/:orderId/complete")
.patch(authentication, authorization(["user"]), completeOrder);

// Cancel order by buyer
orderRouter.route("/:orderId/cancel")
.patch(authentication, authorization(["user"]), cancelOrder);

// ===================== USER SIDE STARTED ===================== //
// Fetch all order of the user
orderRouter.route("/user/all-orders")
.get(authentication, authorization(["user"]), fetchAllUserOrders);

// Fetch all order of the user
orderRouter.route("/user/new-orders")
.get(authentication, authorization(["user"]), fetchNewOrders);

// Fetch processing orders for user
orderRouter.route("/user/processing-orders")
.get(authentication, authorization(["user"]), fetchProcessingOrders);

// Fetch in-transit orders for user
orderRouter.route("/user/in-transit-orders")
.get(authentication, authorization(["user"]), fetchInTransitOrders);

// Fetch delivered orders for user
orderRouter.route("/user/delivered-orders")
.get(authentication, authorization(["user"]), fetchDeliveredOrders);

// Fetch completed orders for user
orderRouter.route("/user/completed-orders")
.get(authentication, authorization(["user"]), fetchCompletedOrders);

// Fetch cancelled orders for user
orderRouter.route("/user/cancelled-orders")
.get(authentication, authorization(["user"]), fetchCancelledOrders);

// Fetch unreviewed products
orderRouter.route("/user/unreviewedProducts")
.get(authentication, authorization(['user']), fetchUnreviewedProducts);
// ===================== USER SIDE ENDED ===================== //


// ===================== BUSINESS SIDE STARTED ===================== // 
// Fetch all orders of the business
orderRouter.route("/business/all-orders")
.get(authentication, authorization(["business"]), fetchAllBusinessOrders);

// Fetch all orders of the business
orderRouter.route("/business/new-orders")
.get(authentication, authorization(["business"]), fetchBusinessNewOrders);

// Fetch processing orders for business
orderRouter.route("/business/processing-orders")
.get(authentication, authorization(["business"]), fetchBusinessProcessingOrders);

// Fetch in-transit orders for business
orderRouter.route("/business/in-transit-orders")
.get(authentication, authorization(["business"]), fetchBsuinessInTransitOrders);

// Fetch delivered orders for business
orderRouter.route("/business/delivered-orders")
.get(authentication, authorization(["business"]), fetchBusinessDeliveredOrders);

// Fetch completed orders for business
orderRouter.route("/business/completed-orders")
.get(authentication, authorization(["business"]), fetchBusinessCompletedOrders);

// Fetch cancelled orders for business
orderRouter.route("/business/cancelled-orders")
.get(authentication, authorization(["business"]), fetchBusinessCancelledOrders);
// ===================== BUSINESS SIDE ENDED ===================== // 

// View order
orderRouter.route("/:orderId/view")
.get(authentication, viewOrder);

module.exports = orderRouter;