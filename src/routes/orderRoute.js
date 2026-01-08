const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const {
    createCheckoutSession,
    verifyPaymentAndCreateOrder,
    getUserOrders,
    getOrderById,
    updateOrderStatus
} = require("../controllers/orderController");

// Router instance
const orderRouter = Router();

// Step 1: Create checkout session (POST /api/v1/orders/checkout)
// User sends cart items, receives Stripe checkout URL
orderRouter.route("/checkout").post(authentication, createCheckoutSession);

// Step 2: Verify payment and create order (GET /api/v1/orders/verify-payment)
// Called after Stripe payment success
orderRouter.route("/verify-payment").get(verifyPaymentAndCreateOrder);

// Step 3: Get user orders (GET /api/v1/orders)
orderRouter.route("/").get(authentication, getUserOrders);

// Step 4: Get single order (GET /api/v1/orders/:orderId)
orderRouter.route("/:orderId").get(authentication, getOrderById);

// Step 5: Update order status (PUT /api/v1/orders/:orderId/status)
orderRouter.route("/:orderId/status").put(authentication, updateOrderStatus);

module.exports = orderRouter;
