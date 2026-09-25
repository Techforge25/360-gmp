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
    const { receiverId, receiverModel, messageType, message, media } = validate(privateMessageValidator, request.body) || {};

    // Attach data
    request.payload = { senderId, senderModel, receiverId, receiverModel, messageType, message, media };
    return next();
});

// Validate conversation ID
const validateConversationId = asyncHandler((request, response, next) => {
    // Sanitize IDs
    const { senderId, receiverId } = request.payload;
    if(!isValidObjectId(senderId)) throw new ApiError(400, "Invalid Sender ID");
    if(!isValidObjectId(receiverId)) throw new ApiError(400, "Invalid Receiver ID");

    // Validate conversation ID
    if(String(senderId) === String(receiverId)) throw new ApiError(403, "You cannot send a message to yourself");

    // Generate conversation ID
    const conversationId = generateConversationId(senderId, receiverId);

    // Attach conversation ID
    request.payload.conversationId = conversationId;
    return next();
});

module.exports = { validateChatPayload, validateConversationId };