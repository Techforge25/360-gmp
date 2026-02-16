const { Schema, model } = require("mongoose");

// Updated Schema
const chatSchema = new Schema({
    // References
    sender: {
        id: { type:Schema.Types.ObjectId, required:true, refPath:"sender.model"},
        model: { type:String, required:true, enum:["UserProfile", "BusinessProfile"]}
    },
    receiver: {
        id: { type:Schema.Types.ObjectId, required:true, refPath:"receiver.model" },
        model: { type:String, required:true, enum:["UserProfile", "BusinessProfile"] }
    },
    customOfferId: { type:Schema.Types.ObjectId, ref:"CustomOffer", default:null },
    conversationId: { type:String, index:true, required:true },

    // Message details
    message: { type:String, trim:true, required:true },
    messageType: { type:String, enum:["text", "file", "customOffer"], default:"text" },
    isRead: { type:Boolean, default:false },

    // Media
    fileUrl: { type:String, trim:true }
}, { timestamps:true });

// Model
const Chat = model("Chat", chatSchema);

module.exports = Chat;