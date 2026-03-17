const Joi = require("joi");

const createProductSchema = Joi.object({
    // Basic info
    title: Joi.string().trim().min(3).max(150).required().label("Product title"),
    image: Joi.string().uri().required().label("Main image"),
    groupImages: Joi.array().items(Joi.string().uri()).max(3).label("Group images"),
    detail: Joi.string().trim().max(2000).allow("", null).optional().label("Product description"),
    category: Joi.string().required().label("Product category"),
    pricePerUnit: Joi.number().positive().required().label("Price per unit"),

    // Tiered pricing
    tieredPricing: Joi.array().items(Joi.object({
        qty: Joi.string().trim().max(100).required().label("Tiered pricing quantity"),
        price: Joi.number().min(1).positive().required().label("Price")
    })).optional().label("Tiered pricing"),

    // Quantity and stocks
    minOrderQty: Joi.number().integer().min(1).required().label("Minimum order quantity"),
    stockQty: Joi.number().integer().min(Joi.ref("minOrderQty")).required().label("Stock quantity"),
    lowStockThreshold: Joi.number().integer().min(1).allow(null).label("Lock threeshold"),    
    shippingCost: Joi.number().min(0).required().label("Shipping Cost"),
    estimatedDeliveryDays: Joi.string().required().label("Estimated Delivery Days"),    
    isFeatured: Joi.boolean(),
    status: Joi.string().valid("pending", "approved", "rejected", "draft"),
    shippingTerms: Joi.string().allow("", null)
});

module.exports = { createProductSchema };