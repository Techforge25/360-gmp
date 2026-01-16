const Joi = require("joi");

const createProductSchema = Joi.object({
    title: Joi.string().min(3).max(150).required().messages({
        "any.required": "Product title is required"
    }),

    image: Joi.string().allow("", null),

    detail: Joi.string().max(2000).allow("", null),

    category: Joi.string().required().messages({
        "any.required": "Category is required"
    }),

    pricePerUnit: Joi.number().positive().required().messages({
        "any.required": "Price per unit is required"
    }),

    tieredPricing: Joi.object().pattern(
        Joi.string().pattern(/^\d+(-\d+)?|\d+\+$/), // e.g. "1-10", "11-50", "51+"
        Joi.number().positive()
    ).allow(null),

    minOrderQty: Joi.number().integer().min(1).required().messages({
        "any.required": "Minimum order quantity is required"
    }),

    stockQty: Joi.number().integer().min(0).required().messages({
        "any.required": "Stock quantity is required"
    }),
    
    lowStockThreshold: Joi.number().integer().min(1).allow(null),    

    shippingMethod: Joi.string().required().label("Shipping Method"),

    shippingCost: Joi.number().min(0).required().label("Shipping Cost"),

    estimatedDeliveryDays: Joi.string().required().label("Estimated Delivery Days"),    

    isFeatured: Joi.boolean(),

    status: Joi.string().valid("pending", "approved", "rejected", "draft"),
    shippingTerms: Joi.string().allow("", null)
});

module.exports = { createProductSchema };
