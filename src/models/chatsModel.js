const { Schema, model } = require("mongoose");

// Updated Schema
const chatSchema = new Schema({
    // References
    senderId: { type: Schema.Types.ObjectId, refPath: "senderModel", required: true },
    senderModel: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] },
    receiverId: { type: Schema.Types.ObjectId, refPath: "receiverModel", required: true },
    receiverModel: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] },    

    // Thread ID
    conversationId: { type: String, index: true, required: true },

    // Message details
    message: { type: String, trim: true, required: true },
    messageType: { type: String, enum: ["text", "media"], default: "text" },

    // Read status
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    // Last message tracking
    lastMessage: { type: String, trim: true },
    lastMessageAt: { type: Date, default: Date.now },

    // Media (Images & Videos URLs)
    media: { type: [String] }
}, { timestamps:true });

// Model
const Chat = model("Chat", chatSchema);

module.exports = Chat;