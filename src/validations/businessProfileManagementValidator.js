const joi = require("joi");

const updateBannerValidator = joi.object({
    banner: joi.string().trim().uri().required().label("Banner")
});

module.exports = { updateBannerValidator };