const Joi = require("joi");
// const { continentList, regionList } = require("../constants");

// Patterns
const titlePattern = /^[a-zA-Z0-9 \-(),.&]*$/; // Allow common product title chars

const createProductValidator = Joi.object({
    // Basic info
    title: Joi.string().pattern(titlePattern).trim().min(3).max(150).required().label("Product title").messages({
        "string.pattern.base": "Product title contains invalid characters"
    }),
    detail: Joi.string().trim().max(5000).allow("", null).optional().label("Product description"),
    image: Joi.string().uri().required().label("Main image"),
    groupImages: Joi.array().items(Joi.string().uri()).max(3).label("Group images"),

    // Category info
    category: Joi.string().required().label("Product category"),
    subCategory: Joi.string().required().label("Product sub-category"),

    // Pricing
    pricePerUnit: Joi.number().positive().required().label("Price per unit"),
    tieredPricing: Joi.array().items(Joi.object({
        qty: Joi.number().integer().optional().allow(null, 0).label("Tiered pricing quantity"),
        price: Joi.number().min(0).optional().label("Price")
    })).optional().label("Tiered pricing"),

    // Quantity and stocks
    minOrderQty: Joi.number().integer().positive().min(1).required().label("Minimum order quantity"),
    stockQty: Joi.number().integer().positive().min(Joi.ref("minOrderQty")).required().label("Stock quantity"),
    lowStockThreshold: Joi.number().integer().min(1).allow(null).label("Lock threeshold"),    
 
    // Checkbox
    isSingleProductAvailable: Joi.boolean()
});

// Reject product validator
const rejectProductValidator = Joi.object({
    note: Joi.string().trim().max(1000).required().label("Note")
});

module.exports = { createProductValidator, rejectProductValidator };