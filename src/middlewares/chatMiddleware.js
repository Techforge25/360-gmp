const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { privateMessageValidator } = require("../validations/chatValidator");

// Get sender info
const getSenderInfo = asyncHandler(async (request, response, next) => {
    // Get details
    const { role } = request.user;
    const { userProfileId, businessProfileId } = request.user.profiles || {};

    // Set dynamic sender details
    const senderId = role === "user" ? userProfileId : businessProfileId;
    const senderModel = role === "user" ? "UserProfile" : "BusinessProfile";

    // Sanitize payload
    const { receiverId, receiverModel, messageType, message, media } = validate(privateMessageValidator, request.body) || {};

    // Attach data
    request.user.sender = { senderId, senderModel };
    request.payload = { receiverId, receiverModel, messageType, message, media };
    return next();
});

module.exports = { getSenderInfo };