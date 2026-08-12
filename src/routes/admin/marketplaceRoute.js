const { Router } = require("express");
const { adminAuthentication, grantAccessTo } = require("../../middlewares/adminAuth");
const { fetchMarketplaceStats, fetchOrderLogs, fetchProductAudits, fetchDisputedOrders, 
viewOrderLog, viewProductDetails, approveProduct, rejectProduct, 
fetchGeneralProducts } = require("../../controllers/admin/marketplaceController");

// Router instance
const marketPlaceRouter = Router();

// Inject router level middleware
marketPlaceRouter.use(adminAuthentication, grantAccessTo("Marketplace & Order Logs"));

// Fetch marketplace stats
marketPlaceRouter.route("/stats").get(fetchMarketplaceStats);

// Fetch order logs
marketPlaceRouter.route("/orderLogs").get(fetchOrderLogs);

// View order log
marketPlaceRouter.route("/orderLogs/:orderId").get(viewOrderLog);

// Fetch product audits
marketPlaceRouter.route("/productAudits").get(fetchProductAudits);

// View product details
marketPlaceRouter.route("/product/:productId").get(viewProductDetails);

// Approve product
marketPlaceRouter.route("/product/:productId/approve").patch(approveProduct);

// Reject product
marketPlaceRouter.route("/product/:productId/reject").patch(rejectProduct);

// Fetch disputed order logs
marketPlaceRouter.route("/disputedOrders").get(fetchDisputedOrders);

// Fetch approve/reject products
marketPlaceRouter.route("/generalProducts").get(fetchGeneralProducts);

module.exports = marketPlaceRouter;