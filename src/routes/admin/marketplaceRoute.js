const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchMarketplaceStats, fetchOrderLogs, fetchProductAudits, fetchDisputedOrders, 
viewOrderLog, viewProductAuditDetails, approveProduct, rejectProduct } = require("../../controllers/admin/marketplaceController");

// Router instance
const marketPlaceRouter = Router();

// Fetch marketplace stats
marketPlaceRouter.route("/stats")
.get(adminAuthentication, fetchMarketplaceStats);

// Fetch order logs
marketPlaceRouter.route("/orderLogs")
.get(adminAuthentication, fetchOrderLogs);

// View order log
marketPlaceRouter.route("/orderLogs/:orderId")
.get(adminAuthentication, viewOrderLog);

// Fetch product audits
marketPlaceRouter.route("/productAudits")
.get(adminAuthentication, fetchProductAudits);

// View product audit
marketPlaceRouter.route("/product/:productId")
.get(adminAuthentication, viewProductAuditDetails);

// Approve product
marketPlaceRouter.route("/product/:productId/approve")
.patch(adminAuthentication, approveProduct);

// Reject product
marketPlaceRouter.route("/product/:productId/reject")
.patch(adminAuthentication, rejectProduct);

// Fetch disputed order logs
marketPlaceRouter.route("/disputedOrderLogs")
.get(adminAuthentication, fetchDisputedOrders);

module.exports = marketPlaceRouter;