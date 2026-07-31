const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchMarketplaceStats, fetchOrderLogs, fetchProductAudits, 
fetchDisputedOrders, viewOrderLog, viewProductAuditDetails } = require("../../controllers/admin/marketplaceController");

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
marketPlaceRouter.route("/productAudits/:productId")
.get(adminAuthentication, viewProductAuditDetails);

// Fetch disputed order logs
marketPlaceRouter.route("/disputedOrderLogs")
.get(adminAuthentication, fetchDisputedOrders);

module.exports = marketPlaceRouter;