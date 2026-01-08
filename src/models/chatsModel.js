const { Schema, model } = require("mongoose");

// Schema
const chatSchema = new Schema({
    senderId: { type:Schema.Types.ObjectId, ref:"User", required:true },
    receiverId: { type:Schema.Types.ObjectId, ref:"User", required:true },
    conversationId: { type:String, index:true, required:true },
    message: { type:String, trim:true, required:true },
    isRead: { type:Boolean, default:false },
    messageType: { type:String, enum:["text", "document"], default:"text" },
    documentFileUrl: { type:String, trim:true }
}, { timestamps:true });

// Model
const Chat = model("Chat", chatSchema);

module.exports = Chat;