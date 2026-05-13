## CONVERSATION MODELS

```javascript
// models/conversation.model.js

const { Schema, model } = require("mongoose");

// Participant schema
const participantSchema = new Schema({
    id: { type: Schema.Types.ObjectId, required: true, refPath: "participants.model" },
    model: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] }
}, { _id: false });

// Pin schema
const pinnedSchema = new Schema({
    id: { type: Schema.Types.ObjectId, required: true, refPath: "pinnedBy.model" },
    model: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] },
    pinnedAt: { type: Date, default: Date.now }
}, { _id: false });

// Archive schema
const archivedSchema = new Schema({
    id: { type: Schema.Types.ObjectId, required: true, refPath: "archivedBy.model" },
    model: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] },
    archivedAt: { type: Date, default: Date.now }
}, { _id: false });

// Block schema
const blockedSchema = new Schema({
    blockedBy: {
        id: { type: Schema.Types.ObjectId, required: true, refPath: "blockedUsers.blockedBy.model" },
        model: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] }
    },

    blockedUser: {
        id: { type: Schema.Types.ObjectId, required: true, refPath: "blockedUsers.blockedUser.model" },
        model: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] }
    },

    blockedAt: { type: Date, default: Date.now }
}, { _id: false });

// Main schema
const conversationSchema = new Schema({
    // Participants
    participants: { type: [participantSchema], required: true, 
        validate: {
            validator: (value) => value.length >= 2,
            message: "Conversation must have at least 2 participants"
        }
    },

    // Last message preview
    lastMessage: { type: String, trim: true, default: "" },
    lastMessageType: { type: String, enum: ["text", "file", "customOffer"], default: "text" },
    lastMessageAt: { type: Date, default: Date.now, index: true },

    // Pin chat
    pinnedBy: { type: [pinnedSchema], default: [] },

    // Archive chat
    archivedBy: { type: [archivedSchema], default: [] },

    // Block users
    blockedUsers: { type: [blockedSchema], default: [] }
}, { timestamps: true });

// Indexes
conversationSchema.index({ "participants.id": 1 });
conversationSchema.index({ lastMessageAt: -1 });

// Model
const Conversation = model("Conversation", conversationSchema);

module.exports = Conversation;
```

---

## CHATS MODEL
```javascript
// models/chat.model.js

const { Schema, model } = require("mongoose");

// Schema
const chatSchema = new Schema({
    // Conversation
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation", required: true, index: true },

    // Sender
    sender: {
        id: { type: Schema.Types.ObjectId, required: true, refPath: "sender.model" },
        model: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] }
    },

    // Receiver
    receiver: {
        id: { type: Schema.Types.ObjectId, required: true, refPath: "receiver.model" },
        model: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] }
    },

    // Custom offer
    customOfferId: { type: Schema.Types.ObjectId, ref: "CustomOffer", default: null },

    // Message
    message: { type: String, trim: true, required: true },

    // Message type
    messageType: { type: String, enum: ["text", "file", "customOffer"], default: "text" },

    // File
    fileUrl: { type: String, trim: true, default: "" },

    // Read status
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
}, { timestamps: true });

// Indexes
chatSchema.index({ conversationId: 1, createdAt: -1 });
chatSchema.index({ "sender.id": 1 });
chatSchema.index({ "receiver.id": 1 });

// Model
const Chat = model("Chat", chatSchema);

module.exports = Chat;
```

---

## CHAT CONTROLLER
```javascript
// controllers/chat.controller.js

const Conversation = require("../models/conversation.model");
const Chat = require("../models/chat.model");

const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");

/* -------------------------------------------------------------------------- */
/*                              HELPER FUNCTIONS                              */
/* -------------------------------------------------------------------------- */

// Check if user is blocked
const isUserBlocked = (conversation, senderId) => {
    return conversation.blockedUsers.some((block) => block.blockedUser.id.toString() === senderId.toString());
};

// Find existing conversation
const findExistingConversation = async (senderId, receiverId) => {
    return await Conversation.findOne({
        participants: {
            $all: [
                { $elemMatch: { id: senderId } },
                { $elemMatch: { id: receiverId } }
            ]
        }
    });
};

/* -------------------------------------------------------------------------- */
/*                             START CONVERSATION                             */
/* -------------------------------------------------------------------------- */

const startConversation = asyncHandler(async (request, response) => {
    const { receiverId, receiverModel } = request.body;

    // Get sender info
    const senderId = request.user._id;
    const senderModel = request.user.role;

    // Check existing conversation
    let conversation = await findExistingConversation(senderId, receiverId);

    // Create if not exists
    if (!conversation) 
    {
        conversation = await Conversation.create({
            participants: [{ id:senderId, model:senderModel }, { id:receiverId, model:receiverModel }]
        });
    }

    // Response
    return response.status(200).json(new ApiResponse(200, conversation, "Conversation fetched successfully"));
});

/* -------------------------------------------------------------------------- */
/*                               SEND MESSAGE                                 */
/* -------------------------------------------------------------------------- */

const sendMessage = asyncHandler(async (request, response) => {
    const { conversationId, receiverId, receiverModel, message, messageType = "text", fileUrl = "", customOfferId = null } = request.body;

    // Get sender info
    const senderId = request.user._id;
    const senderModel = request.user.role;

    // Find conversation
    const conversation = await Conversation.findById(conversationId);
    if(!conversation) throw new ApiError(404, "Conversation not found");
    
    // Prevent blocked user
    if(isUserBlocked(conversation, senderId)) throw new ApiError(403, "You cannot send messages in this conversation");
    
    // Create message
    const chat = await Chat.create({
        conversationId,
        sender: { id: senderId, model: senderModel },
        receiver: { id: receiverId, model: receiverModel },
        message,
        messageType,
        fileUrl,
        customOfferId
    });

    // Update conversation
    conversation.lastMessage = message;
    conversation.lastMessageType = messageType;
    conversation.lastMessageAt = new Date();

    // Save
    await conversation.save();

    // Response
    return response.status(201).json(new ApiResponse(201, chat, "Message sent successfully"));
});

/* -------------------------------------------------------------------------- */
/*                               FETCH MESSAGES                               */
/* -------------------------------------------------------------------------- */

const fetchMessages = asyncHandler(async (request, response) => {
    const { conversationId } = request.params;

    // Fetch messages
    const messages = await Chat.find({ conversationId }).sort({ createdAt: 1 });

    // Response
    return response.status(200).json(new ApiResponse(200, messages, "Messages fetched successfully"));
});

/* -------------------------------------------------------------------------- */
/*                             FETCH CONVERSATIONS                            */
/* -------------------------------------------------------------------------- */

const fetchConversations = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Fetch conversations
    const conversations = await Conversation.find({ "participants.id": userId,

        // Exclude archived chats
        archivedBy: {
            $not: {
                $elemMatch: {
                    id: userId
                }
            }
        }
    }).sort({ lastMessageAt: -1 });

    // Response
    return response.status(200).json(new ApiResponse(200, conversations, "Conversations fetched successfully"));
});

/* -------------------------------------------------------------------------- */
/*                                PIN CHAT                                    */
/* -------------------------------------------------------------------------- */

const pinConversation = asyncHandler(async (request, response) => {
    const { conversationId } = request.params;

    const userId = request.user._id;
    const userModel = request.user.role;

    await Conversation.findByIdAndUpdate(
        conversationId,
        {
            $addToSet: {
                pinnedBy: {
                    id: userId,
                    model: userModel
                }
            }
        }
    );

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Conversation pinned successfully"));
});

/* -------------------------------------------------------------------------- */
/*                              ARCHIVE CHAT                                  */
/* -------------------------------------------------------------------------- */

const archiveConversation = asyncHandler(async (request, response) => {
    const { conversationId } = request.params;

    const userId = request.user._id;
    const userModel = request.user.role;

    await Conversation.findByIdAndUpdate(
        conversationId,
        {
            $addToSet: {
                archivedBy: {
                    id: userId,
                    model: userModel
                }
            }
        }
    );

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Conversation archived successfully"));
});

/* -------------------------------------------------------------------------- */
/*                                BLOCK USER                                  */
/* -------------------------------------------------------------------------- */

const blockUser = asyncHandler(async (request, response) => {
    const { conversationId, blockedUserId, blockedUserModel } = request.body;

    const blockedById = request.user._id;
    const blockedByModel = request.user.role;

    await Conversation.findByIdAndUpdate(
        conversationId,
        {
            $addToSet: {
                blockedUsers: {
                    blockedBy: {
                        id: blockedById,
                        model: blockedByModel
                    },

                    blockedUser: {
                        id: blockedUserId,
                        model: blockedUserModel
                    }
                }
            }
        }
    );

    // Response
    return response.status(200).json(new ApiResponse(200, null, "User blocked successfully"));
});


/* -------------------------------------------------------------------------- */
/*                                   EXPORTS                                  */
/* -------------------------------------------------------------------------- */

module.exports = {
    startConversation,
    sendMessage,
    fetchMessages,
    fetchConversations,
    pinConversation,
    archiveConversation,
    blockUser
};
```