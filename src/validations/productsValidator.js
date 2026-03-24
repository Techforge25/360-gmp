const Joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9 -]*$/;
const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;
const titlePattern = /^[a-zA-Z0-9 \-(),.&]*$/; // Allow common product title chars
const qtyPattern = /^[a-zA-Z0-9 +\-]*$/; // For "10+", "5-10", "100 units"

const createProductSchema = Joi.object({
    // Basic info
    title: Joi.string().pattern(titlePattern).trim().min(3).max(150).required().label("Product title").messages({
        "string.pattern.base": "Product title contains invalid characters"
    }),
    image: Joi.string().uri().required().label("Main image"),
    groupImages: Joi.array().items(Joi.string().uri()).max(3).label("Group images"),
    detail: Joi.string().trim().max(2000).allow("", null).optional().label("Product description"),
    category: Joi.string().pattern(alphaNumericPattern).required().label("Product category"),
    pricePerUnit: Joi.number().positive().required().label("Price per unit"),

    // Tiered pricing
    tieredPricing: Joi.array().items(Joi.object({
        qty: Joi.string().pattern(qtyPattern).trim().max(100).required().label("Tiered pricing quantity").messages({
            "string.pattern.base": "Quantity format is invalid"
        }),
        price: Joi.number().min(1).positive().required().label("Price")
    })).optional().label("Tiered pricing"),

    // Quantity and stocks
    minOrderQty: Joi.number().integer().positive().min(1).required().label("Minimum order quantity"),
    stockQty: Joi.number().integer().positive().min(Joi.ref("minOrderQty")).required().label("Stock quantity"),
    lowStockThreshold: Joi.number().integer().min(1).allow(null).label("Lock threeshold"),    
    shippingCost: Joi.number().min(0).required().label("Shipping Cost"),
    estimatedDeliveryDays: Joi.string().pattern(qtyPattern).required().label("Estimated Delivery Days"),    
    isFeatured: Joi.boolean(),
    status: Joi.string().valid("pending", "approved", "rejected", "draft"),
    shippingTerms: Joi.string().pattern(customPattern).allow("", null)
});

module.exports = { createProductSchema };