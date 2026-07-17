const joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9 -]*$/;
const addressPattern = /^[a-zA-Z0-9 \-.,#]*$/; // added # for house/apt numbers
const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;
const namePattern = /^[a-zA-Z ]*$/; // only letters + spaces

// Create order validation schema
const createOrderValidationSchema = joi.object({
    shippingAddress:{
        name: joi.string().pattern(namePattern).trim().min(3).max(40).required().label("Full name").messages({
            "string.pattern.base": "Name can only contain letters and spaces"
        }),
        phone: joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
            "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
        }).label("Phone"),
        lineAddress: joi.array().items(joi.string().min(10).max(500)).max(2).label("Line addresses"),
        province: joi.string().pattern(alphaNumericPattern).trim().max(50).required().label("State/Province"),
        postalCode: joi.string().pattern(alphaNumericPattern).trim().max(30).required().label("Postal code"),
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
        trackingId: joi.string().pattern(alphaNumericPattern).trim().label("Tracking ID"),
        courierName: joi.string().pattern(alphaNumericPattern).trim().label("Courier partner name")
    }).when("status", { is:"shipped", then:joi.required(), otherwise:joi.forbidden() }).label("Tracking info")
});

// Update order tracking info
const updateTrackingInfoValidationSchema = joi.object({
    courierName: joi.string().pattern(alphaNumericPattern).trim().min(2).required().label("Courier partner name"),
    trackingId: joi.string().pattern(alphaNumericPattern).trim().min(2).max(100).required().label("Tracking ID"),
});

// Cancel order validation schema
const cancelOrderValidationSchema = joi.object({
    cancellation: joi.object({
        reason: joi.string().trim()
        .valid("Changed Mind", "Found a Better Option", "Wrong Item Ordered", "Delayed Preparing Time", "Other")
        .required().label("Cancellation reason"),

        other: joi.string().pattern(customPattern).trim()
        .when("reason", { is:"Other", then:joi.required(), otherwise:joi.forbidden() }).label("Other details"),
        cancelledAt: joi.date().default(() => new Date(), "current timestamp").label("Cancellation timestamp")
    }).label("Cancellation")
});

module.exports = { createOrderValidationSchema, updateOrderStatusValidationSchema, 
updateTrackingInfoValidationSchema, cancelOrderValidationSchema };