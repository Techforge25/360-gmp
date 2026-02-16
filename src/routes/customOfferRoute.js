const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createCustomOffer, getCustomOffer, acceptCustomOffer } = require("../controllers/customOfferController");

// Router instance
const customOfferRouter = Router();

// Get custom offer
customOfferRouter.route("/:customOfferId").get(authentication, authorization(["business", "user"]), getCustomOffer);

// Accept custom offer
customOfferRouter.route("/:customOfferId/accept").patch(authentication, authorization(["user"]), acceptCustomOffer);

module.exports = customOfferRouter;