const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createCustomOffer, getCustomOffer } = require("../controllers/customOfferController");

// Router instance
const customOfferRouter = Router();

// Create custom offer
customOfferRouter.route("/").post(authentication, authorization(["business"]), createCustomOffer);

// Get custom offer
customOfferRouter.route("/:customOfferId").get(authentication, authorization(["business", "user"]), getCustomOffer);

module.exports = customOfferRouter;