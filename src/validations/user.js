const Joi = require("joi");

const userSignupSchema = Joi.object({
    email: Joi.string()
    .email()
    .required()
    .messages({
        "string.email": "Invalid email format",
        "any.required": "Email is required"
    }),

    passwordHash: Joi.string()
    .min(8)
    .required()
    .messages({
        "string.min": "Password must be at least 8 characters",
        "any.required": "Password is required"
    })
});

module.exports = { userSignupSchema };