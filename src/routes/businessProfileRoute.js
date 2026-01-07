const {Router} = require("express");
const { authentication } = require("../middlewares/auth");
const { createBusinessProfile, updateBusinessProfile } = require("../controllers/businessProfileController");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");

const businessProfileRouter = Router();

// Create business profile
businessProfileRouter.route("/").post(authentication, checkSubscription, checkBusinessAccess, createBusinessProfile);

// Update business profile
businessProfileRouter.route("/").put(authentication, checkSubscription, checkBusinessAccess, updateBusinessProfile);


module.exports = businessProfileRouter;