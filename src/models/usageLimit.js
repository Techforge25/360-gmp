const { Schema, model } = require("mongoose");

// Schema
const usageLimitSchema = new Schema({
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
    feature: String,
    maxAllowed: Number,
    usedCount: { type: Number, default: 0 }
});

// Model
const UsageLimit = model("UsageLimit", usageLimitSchema);

module.exports = UsageLimit;