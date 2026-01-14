const BusinessProfile = require("../models/businessProfileSchema");
const Chat = require("../models/chatsModel");
const CustomOffer = require("../models/customOfferModel");
const Product = require("../models/products");
const UserProfile = require("../models/userProfile");
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
    if(messageType.toLowerCase() !== "text" && messageType.toLowerCase() !== "document" && messageType.toLowerCase() !== "customOffer") {
        throw new ApiError(400, "Invalid message type");
    }

    // If the message contains any document file
    if(messageType.toLowerCase() === "document" && !documentFileUrl) throw new ApiError(400, "Document file is missing");

    // Restrict profile from sending messages to same level profile
    if(senderModel === receiverModel) throw new ApiError(400, "You cannot send a message"); 
    
    // Generate unique id for conversation thread
    const conversationId = generateConversationId(senderId, receiverId);
    
    let customOfferContent = null;

    // Custom offer
    if(messageType.toLowerCase() === "customOffer")
    {
        // Only business profile can create custom offer to user profile
        if(senderModel !== "BusinessProfile") throw new ApiError(400, "You are not allowed to create a custom offer");
        if(receiverModel !== "UserProfile") throw new ApiError(400, "You are not allowed to request a custom offer to a business profile");

        // Extract custom offer details from message
        const { productId, quantity, pricePerUnit, subTotal, shippingCost, shippingMethod,
        estimatedDelivery, noteToBuyer } = request.body;

        // Validate sub total
        const calcultatedSubTotal = Number(quantity) * Number(pricePerUnit);
        if(Number(subTotal) !== Number(calcultatedSubTotal)) throw new ApiError(400, "Invalid subtotal amount");    

        // Validate product
        if(!productId) throw new ApiError(400, "Product ID is missing for custom offer");
        const product = await Product.findById(productId).select("_id").lean();
        if(!product) throw new ApiError(404, "Product not found");

        // Validate business profile and user profile
        const [businessProfile, userProfile] = await Promise.all([
            BusinessProfile.findOne({ ownerUserId:senderId }).select("_id").lean(),
            UserProfile.findById(receiverId).select("_id").lean()
        ]);
        if(!businessProfile) throw new ApiError(404, "Sender business profile not found");
        if(!userProfile) throw new ApiError(404, "Receiver user profile not found");

        // Create custom offer message content
        customOfferContent = {
            sellerBusinessProfileId: businessProfile._id,
            buyerUserProfileId: userProfile._id,
            productId: product._id,
            quantity: Number(quantity),
            pricePerUnit: Number(pricePerUnit),
            subTotal: Number(subTotal),
            shippingCost: Number(shippingCost),
            shippingMethod,
            estimatedDelivery,
            noteToBuyer
        };

        // Save to custom offer collection
        const customOffer = await CustomOffer.create(customOfferContent);
        if(!customOffer) throw new ApiError(500, "Failed to create custom offer");
    }

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
    return response.status(201).json(new ApiResponse(201, { chat, customOfferContent }, "Message has been sent"));
});

// Fetch private messages
const fetchPrivateMessages = asyncHandler(async (request, response) => {
    const { senderId, receiverId } = request.query || {};
    if(!senderId) throw new ApiError(400, "Sender ID is missing");
    if(!receiverId) throw new ApiError(400, "Receiver ID is missing");

    // Generate unique id for conversation thread
    const conversationId = generateConversationId(senderId, receiverId);

    // Find private chats
    const chats = await Chat.find({ conversationId }).lean(); 
    if(!chats.length) return response.status(200).json(new ApiResponse(200, [], "No messages yet"));
    return response.status(200).json(new ApiResponse(200, chats, "Messages has been fetched"));
});

module.exports = { sendPrivateMessage, fetchPrivateMessages };