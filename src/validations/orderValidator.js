const joi = require("joi");

// Create order validation schema
const createOrderValidationSchema = joi.object({
    shippingAddress:{
        name: joi.string().trim().min(3).max(40).required().label("Full name"),
        phone: joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
            "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
        }).label("Phone"),
        lineAddress: joi.array().items(joi.string().min(10).max(500)).max(2).label("Line addresses"),
        province: joi.string().trim().max(50).required().label("State/Province"),
        postalCode: joi.string().trim().max(30).required().label("Postal code"),
    },

    items: joi.array().items(joi.object({
        productId: joi.string().trim().required().label("Product ID"),
        quantity: joi.number().min(1).required().label("Quantity")
    }))
});

module.exports = { createOrderValidationSchema };