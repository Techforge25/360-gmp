const BusinessProfile = require("../models/businessProfileSchema");
const Chat = require("../models/chatsModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const convertToMongoId = require("../utils/convertToMongoId");
const generateConversationId = require("../utils/generateConversationId");
const validate = require("../utils/validate");

// Send private message
const sendPrivateMessage = asyncHandler(async (request, response) => {
    // Get sender details
    const { senderId, senderModel } = request.user.sender;

    // Response
    return response.status(200).json(new ApiResponse(200, { data: request.payload }, "Message has been sent"));
});


module.exports = { sendPrivateMessage };