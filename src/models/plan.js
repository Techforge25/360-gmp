const { Schema, model } = require("mongoose");

// Schema
const planSchema = new Schema({
    name: { type:String, required:true },
    price: { type:Number },
    description: { type:String },
    features:[{ type:String }],
    allowsUserAccess: { type:Boolean },
    allowsBusinessAccess: { type:Boolean },
    durationDays: { type:Number },
    // stripePriceId: { type:String, required:true }
});

// Model
const Plan = model("Plan", planSchema);

module.exports = Plan;