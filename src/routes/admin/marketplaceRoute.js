const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { sumTotalSales, sumPendingProducts, sumDisputedOrders, 
fetchOrderLogs, fetchProductAudits } = require("../../controllers/admin/marketplaceController");

// Router instance
const marketPlaceRouter = Router();

// Sum total sales
marketPlaceRouter.route("/totalSales")
.get(adminAuthentication, sumTotalSales);

// Sum pending products
marketPlaceRouter.route("/pendingProducts")
.get(adminAuthentication, sumPendingProducts);

// Sum disputed orders
marketPlaceRouter.route("/disputedOrders")
.get(adminAuthentication, sumDisputedOrders);

// Fetch order logs
marketPlaceRouter.route("/orderLogs")
.get(adminAuthentication, fetchOrderLogs);

// Fetch order logs
marketPlaceRouter.route("/productAudits")
.get(adminAuthentication, fetchProductAudits);

module.exports = marketPlaceRouter;