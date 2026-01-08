const Chat = require("../models/chatsModel");
const User = require("../models/users");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const generateConversationId = require("../utils/generateConversationId");

// Send private message
const sendPrivateMessage = asyncHandler(async (request, response) => {
    const senderId = request.user._id;
    const { receiverId, message, messageType = "text", documentFileUrl = null } = request.body || {};

    // Basic validations
    if(!receiverId) throw new ApiError(400, "Receiver ID is missing");
    if(receiverId === senderId) throw new ApiError(400, "You cannot send a message to yourself");
    if(!message) throw new ApiError(400, "Message is required");
    if(messageType.toLowerCase() !== "text" && messageType.toLowerCase() !== "document") throw new ApiError(400, "Invalid message type");

    // If the message contains any document file
    if(messageType.toLowerCase() === "document" && !documentFileUrl) throw new ApiError(400, "Document file is missing");

    // Check reciever existence
    const user = await User.findById(receiverId).select("_id").lean();
    if(!user) throw new ApiError(404, "User not found! Invalid receiver ID");

    // Generate unique id for conversation thread
    const conversationId = generateConversationId(senderId, receiverId);

    // Save to db
    const chat = await Chat.create({ senderId, receiverId, conversationId, message, messageType, documentFileUrl });
    if(!chat) throw new ApiError(400, "Failed to send a message");

    // Response
    return response.status(200).json(new ApiResponse(200, chat, "Message has been sent"));
});

module.exports = { sendPrivateMessage };