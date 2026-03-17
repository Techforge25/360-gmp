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

// Update order status
const updateOrderStatusValidationSchema = joi.object({
    status: joi.string().trim().valid("processing", "shipped", "in-transit", "delivered").required().label("Order status"),
    tracking: joi.object({
        trackingId: joi.string().trim().label("Tracking ID"),
        courierName: joi.string().trim().label("Courier partner name")
    }).when("status", { is:"shipped", then:joi.required(), otherwise:joi.forbidden() }).label("Tracking info")
});

// Update order tracking info
const updateTrackingInfoValidationSchema = joi.object({
    courierName: joi.string().trim().min(2).required().label("Courier partner name"),
    trackingId: joi.string().trim().min(2).max(100).required().label("Tracking ID"),
});

// Cancel order validation schema
const cancelOrderValidationSchema = joi.object({
    cancellation: joi.object({
        reason: joi.string().trim()
        .valid("Changed Mind", "Found a Better Option", "Wrong Item Ordered", "Delayed Delivery", "Other")
        .required().label("Cancellation reason"),

        other: joi.string().trim()
        .when("reason", { is:"Other", then:joi.required(), otherwise:joi.forbidden() }).label("Other details")
    }).label("Cancellation")
});

module.exports = { createOrderValidationSchema, updateOrderStatusValidationSchema, 
updateTrackingInfoValidationSchema, cancelOrderValidationSchema };