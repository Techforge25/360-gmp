const { Schema, model } = require("mongoose");

// Schema
const subscriptionSchema = new Schema({
    userId: { type:Schema.Types.ObjectId, ref:"User" },
    planId: { type:Schema.Types.ObjectId, ref:"Plan" },
    status: { type:String, enum: ["active", "canceled", "expired"], default: "active" },
    // stripeSubscriptionId: { type:String, required:true },
    startDate: { type:Date, required:true },
    endDate: { type:Date, required:true }
});

// Model
const Subscription = model("Subscription", subscriptionSchema);

module.exports = Subscription;