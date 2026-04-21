const joi = require("joi");

// Update logo validator
const updateLogoValidator = joi.object({
    logo: joi.string().trim().uri().required().label("Logo")
});

// Update banner validator
const updateBannerValidator = joi.object({
    banner: joi.string().trim().uri().required().label("Banner")
});

module.exports = { updateLogoValidator, updateBannerValidator };