const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createCustomOffer } = require("../controllers/customOfferController");

// Router instance
const customOfferRouter = Router();

// Create custom offer
customOfferRouter.route("/").post(authentication, authorization(["business"]), createCustomOffer);

module.exports = customOfferRouter;