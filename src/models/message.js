const { Schema, model } = require("mongoose");

// Schema
const messageSchema = new Schema({
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    senderType: { type: String, enum: ["USER", "BUSINESS"] },
    senderProfileId: Schema.Types.ObjectId,
    messageType: String,
    content: String
}, { timestamps: true });

// Model
const Message = model("Message", messageSchema);

module.exports = Message;