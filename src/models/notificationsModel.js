const { Schema, model } = require("mongoose");

// Schema
const notificationSchema = new Schema({
    userId:{ type:Schema.Types.ObjectId, ref:"user", required:true },
    title:{ type:String, trim:true, required:true },
    content:{ type:String, trim:true, required:true },
    haveSeen:{ type:Boolean, required:true, default:false }
}, { timestamps:true });

// Model
const Notification = model("Notification", notificationSchema);

module.exports = Notification;