const { Schema, model } = require("mongoose");

// Schema
const planSchema = new Schema({
    name: String,
    allowsUserAccess: Boolean,
    allowsBusinessAccess: Boolean,
    durationDays: Number,
    price: Number
});

// Model
const Plan = model("Plan", planSchema);

module.exports = Plan;