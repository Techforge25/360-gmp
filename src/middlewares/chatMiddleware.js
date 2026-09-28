const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");
const generateConversationId = require("../utils/generateConversationId");
const validate = require("../utils/validate");
const { privateMessageValidator } = require("../validations/chatValidator");
const { isValidObjectId } = require("mongoose");

// Validate chat payload
const validateChatPayload = asyncHandler((request, response, next) => {
    // Get sender details
    const { role } = request.user;
    const { userProfileId, businessProfileId } = request.user.profiles || {};

    // Set dynamic sender ID and Model
    const senderId = role === "user" ? userProfileId : businessProfileId;
    const senderModel = role === "user" ? "UserProfile" : "BusinessProfile";

    // Sanitize payload
    const { recipientId, recipientModel, messageType, message, media } = validate(privateMessageValidator, request.body) || {};

    // Attach chat payload
    request.chatPayload = { 
        senderId, 
        senderModel, 
        recipientId, 
        recipientModel, 
        message,
        messageType,  
        media
    };

    // Attach thread payload
    request.threadPayload = {
        senderId, 
        senderModel, 
        recipientId, 
        recipientModel,
        lastMessage: message, 
        lastMessageAt: new Date(),
        messageType,
        media
    };

    return next();
});

// Validate conversation ID
const validateConversationId = asyncHandler((request, response, next) => {
    // Sanitize IDs
    const { senderId, recipientId } = request.chatPayload;
    if(!isValidObjectId(senderId)) throw new ApiError(400, "Invalid Sender ID");
    if(!isValidObjectId(recipientId)) throw new ApiError(400, "Invalid Recipient ID");

    // Validate conversation ID
    if(String(senderId) === String(recipientId)) throw new ApiError(403, "You cannot send a message to yourself");

    // Generate conversation ID
    const conversationId = generateConversationId(senderId, recipientId);

    // Attach conversation ID
    request.chatPayload.conversationId = conversationId;
    request.threadPayload.conversationId = conversationId;
    return next();
});

module.exports = { validateChatPayload, validateConversationId };