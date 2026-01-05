const { Schema, model } = require("mongoose");

// Schema
const subscriptionSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },
    status: String,
    startDate: Date,
    endDate: Date
});

// Model
const Subscription = model("Subscription", subscriptionSchema);

module.exports = Subscription;