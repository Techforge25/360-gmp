const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const chatSchema = new Schema({
    // References
    senderId: { type: Schema.Types.ObjectId, refPath: "senderModel", required: true },
    senderModel: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] },
    recipientId: { type: Schema.Types.ObjectId, refPath: "recipientModel", required: true },
    recipientModel: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] },    

    // Conversation ID
    conversationId: { type: String, trim: true, required: true, index: true, },

    // Message details
    message: { type: String, trim: true, required: true },
    messageType: { type: String, enum: ["text", "media"], default: "text" },

    // Read status
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },

    // Media (Images & Videos URLs)
    media: { type: [String] }
}, { timestamps:true });

// Add pagination plugin
chatSchema.plugin(aggregatePaginate);

// Model
const Chat = model("Chat", chatSchema);

module.exports = Chat;