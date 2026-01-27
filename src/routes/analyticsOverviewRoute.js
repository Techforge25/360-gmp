const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { fetchViewsOverTime, fetchJobApplicationFunnel, fetchTopPerformingProducts, 
fetchCompetitorBenchMarking } = require("../controllers/analyticsOverviewController");

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

// Fetch competitor bench marking
analyticsOverviewRouter.route("/competitor-bench-marking")
.get(authentication, authorization(["business"]), fetchCompetitorBenchMarking);

module.exports = analyticsOverviewRouter;