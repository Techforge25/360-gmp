const { isValidObjectId } = require("mongoose");
const BusinessProfile = require("../models/businessProfileSchema");
const Chat = require("../models/chatsModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const convertToMongoId = require("../utils/convertToMongoId");
const generateConversationId = require("../utils/generateConversationId");
const { emptyList } = require("../constants");

// Send private message
const sendPrivateMessage = asyncHandler(async (request, response) => {
    // Get payload
    const payload = request.payload;

    // Save to db
    const chat = await Chat.create(payload);
    if(!chat) throw new ApiError(500, "Failed to save chat");

    // Send real time
    const io = request.app.get("io");
    io.to(String(payload.recipientId)).emit("privateMessage", { ...payload });

    // Response
    return response.status(200).json(new ApiResponse(200, { ...payload }, "Message has been sent"));
});

// Fetch thread list
const fetchPrivateMessages = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Sanitize ID
    const { recipientId } = request.params;
    if(!isValidObjectId(recipientId)) throw new ApiError(400, "Invalid Recipient ID");

    // Get sender details
    const { role } = request.user;
    const { userProfileId, businessProfileId } = request.user.profiles || {};

    // Set dynamic sender ID and Model
    const senderId = role === "user" ? userProfileId : businessProfileId;

    // Generate conversation ID
    const conversationId = generateConversationId(senderId, recipientId);

    // Fetch
    const messages = await Chat.aggregatePaginate([
        // Match 
        { $match: { conversationId } },



        // Sort
        { $sort: { lastMessageAt: -1 } },

        // Projection
        {
            $project: {
                message: 1,
                messageType: 1,
                isRead: 1,
                lastMessage: 1,
                lastMessageAt: 1,
                media: 1,
                createdAt: 1
            }
        }
    ], { page, limit });
    if(!messages.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No messages found"));

    // Response
    return response.status(200).json(new ApiResponse(200, messages, "Threads have been fetched"));
});

module.exports = { sendPrivateMessage, fetchPrivateMessages };