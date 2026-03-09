const { Schema, model } = require("mongoose");

// Schema
const usageLimitSchema = new Schema({
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    feature: String,
    maxAllowed: Number,
    usedCount: { type: Number, default: 0 }
});

// Model
const UsageLimit = model("UsageLimit", usageLimitSchema);

module.exports = UsageLimit;