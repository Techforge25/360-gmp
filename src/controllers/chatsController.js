const BusinessProfile = require("../models/businessProfileSchema");
const Chat = require("../models/chatsModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const convertToMongoId = require("../utils/convertToMongoId");

// Send private message
const sendPrivateMessage = asyncHandler(async (request, response) => {
    // Get payload
    const payload = request.payload;

    // Save to db
    const chat = await Chat.create(payload);
    if(!chat) throw new ApiError(500, "Failed to save chat");

    // Send real time
    const io = request.app.get("io");
    io.to(String(payload.receiverId)).emit("privateMessage", { ...payload });

    // Response
    return response.status(200).json(new ApiResponse(200, { ...payload }, "Message has been sent"));
});


module.exports = { sendPrivateMessage };