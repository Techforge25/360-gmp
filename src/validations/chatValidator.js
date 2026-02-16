const joi = require("joi");

// Validation schema for sending private message
const privateMessageValidationSchema = joi.object({
    // Sender details
    senderId: joi.string().required().label("Sender ID"),
    senderModel: joi.string().valid("UserProfile", "BusinessProfile").required().label("Sender Model"),

    // Receiver details
    receiverId: joi.string().required().label("Receiver ID"),
    receiverModel: joi.string().valid("UserProfile", "BusinessProfile").required().label("Receiver Model"),

    // Message details
    message: joi.string().trim().max(5000).required().label("Message"),
    messageType: joi.string().valid("text", "file", "customOffer").default("text").label("Message Type"),
    fileUrl: joi.string().uri().when("messageType", { is:"file", then:joi.required(), otherwise:joi.optional() }).label("File URL"),

    // Custom offer details
    customOfferDetails: joi.object({
        productId: joi.string().required().label("Product ID"),
        quantity: joi.number().positive().required().label("Quantity"),
        pricePerUnit: joi.number().positive().required().label("Price Per Unit"),
        subTotal: joi.number().positive().required().label("Sub Total"),
        shippingCost: joi.number().positive().required().label("Shipping Cost"),
        shippingMethod: joi.string().trim().required().label("Shipping Method"),
        estimatedDelivery: joi.string().required().label("Estimated Delivery"),
        noteToBuyer: joi.string().trim().allow("").label("Note To Buyer")
    }).when("messageType", { is:"customOffer", then:joi.required(), otherwise:joi.optional() }).label("Custom Offer Details")
});

module.exports = { privateMessageValidationSchema };