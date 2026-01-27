const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { fetchViewsOverTime, fetchJobApplicationFunnel } = require("../controllers/analyticsOverviewController");

// Router instance
const analyticsOverviewRouter = Router();

// Views over time graph
analyticsOverviewRouter.route("/views-over-time")
.get(authentication, authorization(["business"]), fetchViewsOverTime);

// Application success funnel graph
analyticsOverviewRouter.route("/application-success-funnel")
.get(authentication, authorization(["business"]), fetchJobApplicationFunnel);

// Top purchased categories graph
analyticsOverviewRouter.route("/top-purchased-categories")
.get(authentication, authorization(["business"]));

module.exports = analyticsOverviewRouter;