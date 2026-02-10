const BusinessProfile = require("../models/businessProfileSchema");
const Chat = require("../models/chatsModel");
const CustomOffer = require("../models/customOfferModel");
const Product = require("../models/products");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const generateConversationId = require("../utils/generateConversationId");
const validate = require("../utils/validate");
const { privateMessageValidationSchema } = require("../validations/chatValidator");

// Send private message
const sendPrivateMessage = asyncHandler(async (request, response) => {
    // Validate payload
    const { senderId, senderModel, receiverId, receiverModel, message, messageType = "text", 
    fileUrl = null, customOfferDetails = null } = validate(privateMessageValidationSchema, request.body) || {};

    // Restrict sending message to self
    if(receiverId === senderId) throw new ApiError(400, "You cannot send a message to yourself");

    // Restrict profile from sending messages to same level profile
    if(senderModel === receiverModel) throw new ApiError(400, "You cannot send a message to a same level profile"); 
    
    // Generate unique id for conversation thread
    const conversationId = generateConversationId(senderId, receiverId);
    
    let customOfferPayload = null;

    // Custom offer
    if(messageType === "customOffer")
    {
        // Only business profile can create custom offer to user profile
        if(senderModel !== "BusinessProfile") throw new ApiError(400, "You are not allowed to create a custom offer");
        if(receiverModel !== "UserProfile") throw new ApiError(400, "You are not allowed to request a custom offer to a business profile");

        // Extract custom offer details
        const { productId, quantity, pricePerUnit, subTotal } = customOfferDetails || {};

        // Validate sub total
        const calcultatedSubTotal = Number(quantity) * Number(pricePerUnit);
        if(Number(subTotal) !== Number(calcultatedSubTotal)) throw new ApiError(400, "Invalid subtotal amount");    

        // Validate product
        if(!productId) throw new ApiError(400, "Product ID is missing for custom offer");
        const product = await Product.findById(productId).select("businessId").lean();
        if(!product) throw new ApiError(404, "Product not found");

        // check if porduct belongs to the sender business profile
        if(String(product.businessId) !== String(senderId))
        {
            throw new ApiError(403, "You are not allowed to create a custom offer for a product that does not belong to your business profile");
        }

        // Validate business profile and user profile
        const [businessProfile, userProfile] = await Promise.all([
            BusinessProfile.findById(senderId).select("_id").lean(),
            UserProfile.findById(receiverId).select("_id").lean()
        ]);
        if(!businessProfile) throw new ApiError(404, "Sender business profile not found");
        if(!userProfile) throw new ApiError(404, "Receiver user profile not found");

        // Prepare custom offer payload
        customOfferPayload = {
            sellerBusinessProfileId: senderId,
            buyerUserProfileId: receiverId,
            ...customOfferDetails
        };

        // Save to custom offer collection
        const customOffer = await CustomOffer.create(customOfferPayload);
        if(!customOffer) throw new ApiError(500, "Failed to create custom offer");
    }

    // Save to db
    const chat = await Chat.create({ 
        sender:{ id:senderId, model:senderModel },
        receiver:{ id:receiverId, model:receiverModel },
        conversationId,
        message,
        messageType,
        fileUrl
    });
    if(!chat) throw new ApiError(400, "Failed to send a message");

    // Get socket instance
    const io = request.app.get("io");

    // Helper function for room name
    const getRoomName = (model, id) => {
        if(model === "BusinessProfile") return `businessProfile:${id}`;
        if(model === "UserProfile") return `userProfile:${id}`;
        return null;
    };

    // Emit to sender
    const senderRoom = getRoomName(senderModel, senderId);
    if(senderRoom) io.to(senderRoom).emit("message", { chat, customOfferPayload });
    
    // Emit to receiver
    const receiverRoom = getRoomName(receiverModel, receiverId);
    if(receiverRoom) io.to(receiverRoom).emit("message", { chat, customOfferPayload });

    // Response
    return response.status(201).json(new ApiResponse(201, { chat, customOfferPayload }, "Message has been sent"));
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

    // Response
    return response.status(200).json(new ApiResponse(200, chats, "Messages has been fetched"));
});

module.exports = { sendPrivateMessage, fetchPrivateMessages };