const joi = require("joi");

const forgotPasswordSchema = joi.object({
    email: joi.string().trim().lowercase().email().required().label("Email address")
});

module.exports = forgotPasswordSchema;