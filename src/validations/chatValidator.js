const joi = require("joi");

// Validation schema for sending private message
const privateMessageValidator = joi.object({
    // Receiver details
    receiverId: joi.string().trim().required().length(24).label("Receiver ID"),
    receiverModel: joi.string().trim().required().valid("UserProfile", "BusinessProfile").label("Receiver odel"),

    // Message details
    message: joi.string().trim().required().min(1).label("Message"),
    messageType: joi.string().valid("text", "media").default("text").label("Message type"),
    mediaUrl: joi.string().uri().when("messageType", { 
        is: "media", 
        then: joi.required(), 
        otherwise: joi.optional() 
    }).label("Media URL"),
});

module.exports = { privateMessageValidator };