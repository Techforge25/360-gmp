const { Schema, model } = require("mongoose");

// Schema
const trialUsageSchema = new Schema({
    // Referencing
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true },

    // Trackings
    ordersUsed: { type: Number, default: 0 },
    messagesUsed: { type: Number, default: 0 }
}, { timestamps: true });

// Model
const TrialUsage = model("TrialUsage", trialUsageSchema);

module.exports = TrialUsage;