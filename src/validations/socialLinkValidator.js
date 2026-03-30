const joi = require("joi");

// Social link validation schema
const socialLinkValidationSchema = joi.object({
    platformName: joi.string().trim().max(100).required().label("Platform Name"),
    url: joi.string().uri().required().label("URL")
});

module.exports = socialLinkValidationSchema;