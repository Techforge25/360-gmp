const { Schema, model } = require("mongoose");

// Schema
const conversationSchema = new Schema({
    userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    businessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    context: String,
    status: String
}, { timestamps: true });

// Model
const Conversation = model("Conversation", conversationSchema);

module.exports = Conversation;