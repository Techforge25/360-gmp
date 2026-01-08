const Joi = require("joi");

// Cart item validation schema
const cartItemSchema = Joi.object({
    productId: Joi.string().required().messages({
        "string.empty": "Product ID is required",
        "any.required": "Product ID is required"
    }),
    quantity: Joi.number().integer().min(1).required().messages({
        "number.base": "Quantity must be a number",
        "number.integer": "Quantity must be an integer",
        "number.min": "Quantity must be at least 1",
        "any.required": "Quantity is required"
    })
});

// Create checkout session validation
const createCheckoutSchema = Joi.object({
    items: Joi.array().items(cartItemSchema).min(1).required().messages({
        "array.base": "Items must be an array",
        "array.min": "At least one item is required",
        "any.required": "Items array is required"
    }),
    shippingAddress: Joi.string().required().messages({
        "string.empty": "Shipping address is required",
        "any.required": "Shipping address is required"
    })
});

// Update order status validation
const updateOrderStatusSchema = Joi.object({
    orderStatus: Joi.string()
        .valid("Pending", "Processing", "Confirmed", "Shipped", "Delivered", "Cancelled")
        .required()
        .messages({
            "any.only": "Order status must be one of: Pending, Processing, Confirmed, Shipped, Delivered, Cancelled",
            "any.required": "Order status is required"
        })
});

module.exports = {
    createCheckoutSchema,
    updateOrderStatusSchema
};
