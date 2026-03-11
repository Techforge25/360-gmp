const { Router } = require("express");
const { adminAuthentication } = require("../../middlewares/adminAuth");
const { fetchTotalSales } = require("../../controllers/admin/marketPlaceController");

// Router instance
const marketPlaceRouter = Router();

// Fetch total sales
marketPlaceRouter.route("/totalSales")
.get(adminAuthentication, fetchTotalSales);

module.exports = marketPlaceRouter;