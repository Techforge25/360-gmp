const { Router } = require("express");
const { savePlan, fetchAllPlans } = require("../controllers/plan");
const { authentication } = require("../middlewares/auth");

// Router instance
const planRouter = Router();

// Save plan / Fetch all plans
planRouter.route("/", authentication)
.post(savePlan)
.get(fetchAllPlans);

module.exports = planRouter;