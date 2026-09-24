const asyncHandler = require("../utils/asyncHandler");

// Get sender info
const getSenderInfo = asyncHandler(async (request, response, next) => {
    // Get details
    const { role } = request.user;
    const { userProfileId, businessProfileId } = request.user.profiles || {};

    // Set dynamic sender details
    const senderId = role === "user" ? userProfileId : businessProfileId;
    const senderModel = role === "user" ? "UserProfile" : "BusinessProfile";

    // Attach sender details
    request.user.sender = { senderId, senderModel };
    return next();
});

module.exports = { getSenderInfo };