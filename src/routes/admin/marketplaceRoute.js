const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { sumTotalSales, sumPendingProducts } = require("../../controllers/admin/marketplaceController");

// Router instance
const marketPlaceRouter = Router();

// Sum total sales
marketPlaceRouter.route("/totalSales")
.get(adminAuthentication, sumTotalSales);

// Sum pending products
marketPlaceRouter.route("/pendingProducts")
.get(adminAuthentication, sumPendingProducts);

module.exports = marketPlaceRouter;