const { Schema, model } = require("mongoose");

// Schema
const customOfferSchema = new Schema({
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    businessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    status: String,
    totalAmount: Number,
    terms: String,
    validUntil: Date
}, { timestamps: true });

// Model
const CustomOffer = model("CustomOffer", customOfferSchema);

module.exports = CustomOffer;