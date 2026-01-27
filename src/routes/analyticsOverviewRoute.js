const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { fetchViewsOverTime, fetchJobApplicationFunnel, fetchTopPerformingProducts } = require("../controllers/analyticsOverviewController");

// Router instance
const analyticsOverviewRouter = Router();

// Views over time graph
analyticsOverviewRouter.route("/views-over-time")
.get(authentication, authorization(["business"]), fetchViewsOverTime);

// Application success funnel graph
analyticsOverviewRouter.route("/application-success-funnel")
.get(authentication, authorization(["business"]), fetchJobApplicationFunnel);

// Top performing products graph
analyticsOverviewRouter.route("/top-performing-products")
.get(authentication, authorization(["business"]), fetchTopPerformingProducts);

module.exports = analyticsOverviewRouter;