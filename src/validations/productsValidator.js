const Joi = require("joi");

const createProductSchema = Joi.object({
    title: Joi.string().min(3).max(150).required().messages({
        "any.required": "Product title is required"
    }),

    // image: Joi.string().uri().allow("", null),

    detail: Joi.string().max(2000).allow("", null),

    category: Joi.string().required().messages({
        "any.required": "Category is required"
    }),

    pricePerUnit: Joi.number().positive().required().messages({
        "any.required": "Price per unit is required"
    }),

    minOrderQty: Joi.number().integer().min(1).required().messages({
        "any.required": "Minimum order quantity is required"
    }),

    stockQty: Joi.number().integer().min(0).required().messages({
        "any.required": "Stock quantity is required"
    }),

    leadTime: Joi.number().integer().min(0).allow(null),

    shippingTerms: Joi.string().allow("", null)
});

module.exports = { createProductSchema };
