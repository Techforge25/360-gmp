const BusinessProfile = require("../models/businessProfileSchema");
const Chat = require("../models/chatsModel");
const CustomOffer = require("../models/customOfferModel");
const Product = require("../models/products");
const TrialUsage = require("../models/trialUsageModel");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const convertToMongoId = require("../utils/convertToMongoId");
const generateConversationId = require("../utils/generateConversationId");
const validate = require("../utils/validate");
const { privateMessageValidationSchema } = require("../validations/chatValidator");

// Send private message
const sendPrivateMessage = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Restrict trial user from sending messages more than 4
    const { planName } = request.user || {};
    if(!planName) throw new ApiError(400, "No subscription plan name found");
    if(planName === "TRIAL")
    {
        const trial = await TrialUsage.findOneAndUpdate(
            { userId, messagesUsed: { $lt: 4 } },
            { $inc: { messagesUsed: 1 }, $setOnInsert: { userId } },
            { new:true, upsert:true }
        );
        if(!trial) throw new ApiError(403,"Trial users can send only four messages. Please upgrade your plan.");
    }

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
    let customOfferId = null; // For referencing with chat model

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
        customOfferId = customOffer._id;
    }

    // Save to db
    const chat = await Chat.create({ 
        sender:{ id:senderId, model:senderModel },
        receiver:{ id:receiverId, model:receiverModel },
        customOfferId,
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
    const chats = await Chat.find({ conversationId }).populate("customOfferId").sort({ createdAt: -1 }).lean(); 
    if(!chats.length) return response.status(200).json(new ApiResponse(200, [], "No messages yet"));

    // Response
    return response.status(200).json(new ApiResponse(200, chats, "Messages has been fetched"));
});

// Fetch my conversations list
const fetchMyConversations = asyncHandler(async (request, response) => {
    const userProfileId = convertToMongoId(request.user.profiles.userProfileId) 
    || convertToMongoId(request.user.profiles.businessProfileId);
    if(!userProfileId) throw new ApiError(401, "Unauthorized");

    // Aggregate conversations
    const conversations = await Chat.aggregate([
        // Match
        {
            $match: 
            {
                $or: [{ "sender.id": userProfileId }, { "receiver.id": userProfileId }]
            }
        },

        // Sort
        { $sort: { createdAt: -1 } },

        // Group
        {
            $group: {
                _id: "$conversationId",
                lastMessage: { $first: "$$ROOT" },
                unreadCount: {
                    $sum: {
                        $cond: [
                            {
                                $and: [
                                    { $eq: ["$receiver.id", userProfileId] },
                                    { $eq: ["$isRead", false] }
                                ]
                            },
                            1,
                            0
                        ]
                    }
                }
            }
        },

        // Sort by last message
        { $sort: { "lastMessage.createdAt": -1 } }
    ]);

    // Format & attach profile info
    const formatted = await Promise.all(
        conversations.map(async (conv) => {

            const chat = conv.lastMessage;

            const isSender = String(chat.sender.id) === String(userProfileId);
            const otherParticipant = isSender ? chat.receiver : chat.sender;

            let profileData = null;

            if(otherParticipant.model === "UserProfile") 
            {
                profileData = await UserProfile.findById(otherParticipant.id)
                .select("fullName logo").lean();
            }

            if(otherParticipant.model === "BusinessProfile") 
            {
                profileData = await BusinessProfile.findById(otherParticipant.id)
                .select("companyName logo").lean();
            }

            return {
                conversationId: conv._id,
                lastMessage: chat.message,
                lastMessageType: chat.messageType,
                lastMessageTime: chat.createdAt,
                unreadCount: conv.unreadCount,
                participant: {
                    id: otherParticipant.id,
                    model: otherParticipant.model,
                    name: profileData?.fullName || profileData?.companyName || "Unknown",
                    logo: profileData?.logo || null
                }
            };
        })
    );

    // Response
    return response.status(200).json(new ApiResponse(200, formatted, "Conversations fetched successfully"));
});

module.exports = { sendPrivateMessage, fetchPrivateMessages, fetchMyConversations };