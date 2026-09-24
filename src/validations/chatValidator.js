const joi = require("joi");

// Validation schema for sending private message
const privateMessageValidator = joi.object({
    // Receiver details
    receiverId: joi.string().trim().required().length(24).label("Receiver ID"),
    receiverModel: joi.string().trim().required().valid("UserProfile", "BusinessProfile").label("Receiver odel"),

    // Message details
    messageType: joi.string().valid("text", "media").default("text").label("Message type"),

    // Text (Optional only when uploading image or video)
    message: joi.string().when("messageType", {
        is: "text",
        then: joi.string().trim().required().min(1),
        otherwise: joi.optional().allow("", null)
    }).label("Message"),

    // Media URLs (Required only if 'messageType' is media)
    media: joi.array().when("messageType", {
        is: "media",
        then: joi.array().min(1).items(joi.string().trim().uri()),
        otherwise: joi.forbidden()
    }).label("Media")
});

module.exports = { privateMessageValidator };