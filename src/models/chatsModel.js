const { Schema, model } = require("mongoose");

// Schema
const chatSchema = new Schema({
    from:{ type:Schema.Types.ObjectId, ref:"User", required:true },
    to:{ type:Schema.Types.ObjectId, ref:"User", required:true },
    message:{ type:String, required:true },
    conversationId: { type:String, index: true, required:true }
}, { timestamps:true });

// Model
const Chat = model("Chat", chatSchema);

module.exports = Chat;