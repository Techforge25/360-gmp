const { Router } = require("express");
const { createPlan, fetchAllPlans } = require("../controllers/plan");
const { adminAuthentication, adminAuthorization } = require("../middlewares/adminAuth");

// Router instance
const planRouter = Router();

// Save plan / Fetch all plans
planRouter.route("/")
.post(adminAuthentication, adminAuthorization(["admin"]), createPlan)
.get(fetchAllPlans);

module.exports = planRouter;