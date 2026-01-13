const joi = require("joi");

const forgotPasswordSchema = joi.object({
    email: joi.string().email().required()
});

module.exports = forgotPasswordSchema;