const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createOrder } = require("../controllers/ordersController");

// Router instance
const orderRouter = Router();

// Create order
orderRouter.route("/").post(authentication, createOrder);

module.exports = orderRouter;