const Joi = require("joi");

// Create Plan schema
const createPlanSchema = Joi.object({
    name: Joi.string().min(3).max(30).required().trim().messages({
        "any.required": "Plan name is required",
        "string.min": "Plan name must be at least 3 characters long",
        "string.max": "Plan name must not exceed 30 characters"
    }),
    price: Joi.number().required(),
    description: Joi.string().max(1000).trim().allow("", null),
    durationDays: Joi.number().max(35).required(),
});

module.exports = { createPlanSchema };
