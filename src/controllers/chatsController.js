const Chat = require("../models/chatsModel");
const User = require("../models/users");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const generateConversationId = require("../utils/generateConversationId");

// Send private message
const sendPrivateMessage = asyncHandler(async (request, response) => {
    const { senderId, senderModel, receiverId, receiverModel, message, messageType = "text", documentFileUrl = null } = request.body || {};

    // Validation
    if(!senderId) throw new ApiError(400, "Sender ID is missing");
    if(!senderModel) throw new ApiError(400, "Please specify sender model");
    if(senderModel !== "UserProfile" && senderModel !== "BusinessProfile") throw new ApiError(400, "Invalid sender model");

    if(!receiverId) throw new ApiError(400, "Receiver ID is missing");
    if(!receiverModel) throw new ApiError(400, "Please specify receiver model");
    if(receiverModel !== "UserProfile" && receiverModel !== "BusinessProfile") throw new ApiError(400, "Invalid reciever model");

    if(receiverId === senderId) throw new ApiError(400, "You cannot send a message to yourself");
    if(!message) throw new ApiError(400, "Message is required");
    if(messageType.toLowerCase() !== "text" && messageType.toLowerCase() !== "document") throw new ApiError(400, "Invalid message type");

    // If the message contains any document file
    if(messageType.toLowerCase() === "document" && !documentFileUrl) throw new ApiError(400, "Document file is missing");

    // Check sender and reciever existence
    const [_sender, _receiver] = await Promise.all([
        User.findById(senderId).select("_id role").lean(),
        User.findById(receiverId).select("_id role").lean()
    ]);

    // Restrict profile from sending messages to same level profile
    if(_sender?.role === _receiver?.role) throw new ApiError(400, "You cannot send a message");

    // Generate unique id for conversation thread
    const conversationId = generateConversationId(senderId, receiverId);

    // Save to db
    const chat = await Chat.create({ 
        sender:{ id:senderId, model:senderModel },
        receiver:{ id:receiverId, model:receiverModel },
        conversationId,
        message,
        messageType,
        documentFileUrl 
    });

    if(!chat) throw new ApiError(400, "Failed to send a message");

    // Response
    return response.status(201).json(new ApiResponse(201, chat, "Message has been sent"));
});

// Fetch private messages
const fetchPrivateMessages = asyncHandler(async (request, response) => {
    const { senderId, receiverId } = request.body || {};

    // Check sender and reciever existence
    const [sender, receiver] = await Promise.all([
        User.findById(senderId).select("_id role").lean(),
        User.findById(receiverId).select("_id role").lean()
    ]);
    if(!sender) throw new ApiError(404, "User not found! Invalid sender ID")

    // Generate unique id for conversation thread
    const conversationId = generateConversationId(senderId, receiverId);

    // Find private chats
    const chats = await Chat.find({ conversationId }).lean(); 
    if(!chats.length) return response.status(200).json(new ApiResponse(200, [], "No messages yet"));
    return response.status(200).json(new ApiResponse(200, chats, "Messages has been fetched"));
});

module.exports = { sendPrivateMessage, fetchPrivateMessages };