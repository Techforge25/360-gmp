const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const threadSchema = new Schema({
    // References
    senderId: { type: Schema.Types.ObjectId, refPath: "senderModel", required: true },
    senderModel: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] },
    recipientId: { type: Schema.Types.ObjectId, refPath: "recipientModel", required: true },
    recipientModel: { type: String, required: true, enum: ["UserProfile", "BusinessProfile"] },    

    // Unique Conversation ID
    conversationId: { type: String, trim: true, required: true, index: true, unique: true },

    // Last message tracking
    lastMessage: { type: String, trim: true },
    lastMessageAt: { type: Date, default: Date.now },
    messageType: { type: String, enum: ["text", "media"], default: "text" },

    // Media (Images & Videos URLs)
    media: { type: [String] }
}, { timestamps:true });

// Add pagination plugin
threadSchema.plugin(aggregatePaginate);

// Model
const Thread = model("Thread", threadSchema);

module.exports = Thread;