const { isValidObjectId } = require("mongoose");
const Chat = require("../models/chatsModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const convertToMongoId = require("../utils/convertToMongoId");
const generateConversationId = require("../utils/generateConversationId");
const { emptyList } = require("../constants");
const Thread = require("../models/threadsModel");

// Helper function to get profile ID and model
const getProfileIdAndModel = (userPayload) => {
    const { role } = userPayload;
    const { userProfileId, businessProfileId } = userPayload.profiles || {};

    // Set dynamic profile ID and Model
    const profileId = role === "user" ? userProfileId : businessProfileId;
    const profileModel = role === "user" ? "UserProfile" : "BusinessProfile";

    return { profileId: convertToMongoId(profileId), profileModel };
};

// Send private message
const sendPrivateMessage = asyncHandler(async (request, response) => {
    // Get payloads
    const chatPayload = request.chatPayload;
    const threadPayload = request.threadPayload;

    // Get conversation ID
    const { conversationId } = chatPayload;

    // Parallel execution
    const [thread, chat] = await Promise.all([
        // Create or update thread
        Thread.findOneAndUpdate(
            { conversationId },
            { $set: threadPayload },
            { upsert: true }
        ),

        // Create new message
        Chat.create(chatPayload)
    ]);
    if(!chat) throw new ApiError(500, "Failed to send new message");

    // Exclude conversation ID
    delete chatPayload.conversationId;

    // Send real time
    const io = request.app.get("io");
    io.to(String(chatPayload.recipientId)).emit("privateMessage", chatPayload);

    // Response
    return response.status(200).json(new ApiResponse(200, chatPayload, "Message has been sent"));
});

// Fetch threads
const fetchThreads = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search = "", filter = "all" } = request.query;

    // Get dynamic profile Id
    const { profileId } = getProfileIdAndModel(request.user);

    // Fetch
    const threads = await Thread.aggregatePaginate([
        // Match
        { 
            $match: { 
                $or: [
                    { senderId: profileId }, 
                    { recipientId: profileId }
                ] 
            } 
        },

        // Add fields
        {
            $addFields: {
                isMyMessage: { $eq: ["$senderId", profileId] },

                participantId: {
                    $cond: [
                        { $eq: ["$senderId", profileId] },
                        "$recipientId",
                        "$senderId"
                    ]
                },

                participantModel: {
                    $cond: [
                        { $eq: ["$senderId", profileId] },
                        "$recipientModel",
                        "$senderModel"
                    ]
                }
            }
        },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "participantId",
                foreignField: "_id",
                as: "userProfile"
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "participantId",
                foreignField: "_id",
                as: "businessProfile"
            }
        },

        // Lookup unread messages
        {
            $lookup: {
                from: "chats",
                let: { conversationId: "$conversationId" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$conversationId", "$$conversationId"] },
                                    { $eq: ["$recipientId", profileId] },
                                    { $eq: ["$isRead", false] }
                                ]
                            }
                        }
                    },
                    { $count: "count" }
                ],
                as: "unreadMessages"
            }
        },        

        // Add participant
        {
            $addFields: {
                // Participant info
                participant: {
                    $cond: [
                        { $eq: ["$participantModel", "UserProfile"] },
                        {
                            id: { $arrayElemAt: ["$userProfile._id", 0] },
                            name: { $arrayElemAt: ["$userProfile.fullName", 0] },
                            logo: { $arrayElemAt: ["$userProfile.logo", 0] },
                            model: "UserProfile"
                        },
                        {
                            id: { $arrayElemAt: ["$businessProfile._id", 0] },
                            name: { $arrayElemAt: ["$businessProfile.companyName", 0] },
                            logo: { $arrayElemAt: ["$businessProfile.logo", 0] },
                            model: "BusinessProfile"
                        }
                    ]
                },

                // Unread count
                unreadCount: {
                    $ifNull: [
                        { $arrayElemAt: ["$unreadMessages.count", 0] },
                        0
                    ]
                }                
            }
        },

        // Search
        ...(search ? [
            { $match: { "participant.name": { $regex: search, $options: "i" } } }
        ] : []),  
        
        // Unread filter
        ...(filter && filter === "unread" ? [
            { $match: { unreadCount: { $gt: 0 } } },
        ] : []),

        // Sort
        { $sort: { lastMessageAt: -1 } },

        // Project
        {
            $project: {
                conversationId: 1,
                isMyMessage: 1,
                participant: 1,
                lastMessage: 1,
                lastMessageAt: 1,
                messageType: 1,
                media: 1,
                isRead: 1,
                unreadCount: 1
            }
        }
    ], { page, limit });
    if(!threads.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No threads found"));

    // Response
    return response.status(200).json(new ApiResponse(200, threads, "Threads have been fetched"));
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
        { $sort: { createdAt: -1 } },

        // Projection
        {
            $project: {
                message: 1,
                messageType: 1,
                isRead: 1,
                isMyMessage: { $eq: ["$senderId", convertToMongoId(senderId)] },
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

// Mark messages as read
const markAsRead = asyncHandler(async (request, response) => {
    const { conversationId } = request.params;
    
    // Get profile ID
    const { profileId } = getProfileIdAndModel(request.user);

    // Update
    await Chat.updateMany(
        { conversationId, recipientId: profileId, isRead: false },
        { $set: { isRead: true } }
    );

    // Response
    return response.status(200).json(new ApiResponse(200, null, "All messages have been marked as read"));
});

module.exports = { sendPrivateMessage, fetchThreads, fetchPrivateMessages, markAsRead };