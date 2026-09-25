const joi = require("joi");

// Validation schema for sending private message
const privateMessageValidator = joi.object({
    // Receiver details
    receiverId: joi.string().trim().required().length(24).label("Receiver ID"),
    receiverModel: joi.string().trim().required().valid("UserProfile", "BusinessProfile").label("Receiver Model"),

    // Message details
    messageType: joi.string().valid("text", "media").default("text").label("Message type"),

    // Text (Optional only when uploading image or video)
    message: joi.when("messageType", {
        is: "text",
        then: joi.string().trim().min(1).required(),
        otherwise: joi.string().trim().optional().allow("", null)
    }).label("Message"),

    // Media URLs (Required only if 'messageType' is media)
    media: joi.when("messageType", {
        is: "media",
        then: joi.array().min(1).items(joi.string().trim().uri()).required(),
        otherwise: joi.forbidden()
    }).label("Media") 
});

module.exports = { privateMessageValidator };