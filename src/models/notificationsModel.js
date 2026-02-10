const { Schema, model } = require("mongoose");

// Schema
const notificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, trim: true, required: true },
    content: { type: String, trim: true, required: true },
    type: { type: String, enum: ["account", "order", "payment", "general", "security", "system"], default:"account" },
    haveSeen: { type: Boolean, default: false }
}, { timestamps:true });

// Model
const Notification = model("Notification", notificationSchema);

module.exports = Notification;