const { Router } = require("express");
const { createPlan, fetchAllPlans } = require("../controllers/plan");
const { authentication } = require("../middlewares/auth");

// Router instance
const planRouter = Router();

// Save plan / Fetch all plans
planRouter.route("/")
.post(authentication, createPlan)
.get(fetchAllPlans);

module.exports = planRouter;