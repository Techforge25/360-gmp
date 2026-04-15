const { Router } = require("express");
const { globalSearch } = require("../controllers/exploreController");
const { authentication } = require("../middlewares/auth");

// Router instance
const exploreRouter = Router();

// Global search
exploreRouter.route("/").get(authentication, globalSearch);

module.exports = exploreRouter;