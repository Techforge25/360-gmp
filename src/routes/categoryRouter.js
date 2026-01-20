const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { createCategory, fetchAllCategories } = require("../controllers/categoryController");

// Router instance
const categoryRouter = Router();

// Create category
categoryRouter.route("/")
.post(authentication, createCategory)
.get(authentication, fetchAllCategories);

module.exports = categoryRouter;