const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { fetchViewsOverTime } = require("../controllers/analyticsOverviewController");

// Router instance
const analyticsOverviewRouter = Router();

// Views over time
analyticsOverviewRouter.route("/views-over-time")
.get(authentication, authorization(["business"]), fetchViewsOverTime);

// Application success funnel
analyticsOverviewRouter.route("/application-success-funnel")
.get(authentication, authorization(["business"]));

// Top purchased categories
analyticsOverviewRouter.route("/top-purchased-categories")
.get(authentication, authorization(["business"]));

module.exports = analyticsOverviewRouter;