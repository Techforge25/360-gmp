const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");

// Schema
const notificationSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    title: { type: String, trim: true, required: true },
    content: { type: String, trim: true, required: true },
    type: { type: String, enum: ["System", "UserProfile", "BusinessProfile"], default:"System" },
    haveSeen: { type: Boolean, default: false }
}, { timestamps:true });

// Inject pagination plugin
notificationSchema.plugin(paginate);

// Model
const Notification = model("Notification", notificationSchema);

module.exports = Notification;