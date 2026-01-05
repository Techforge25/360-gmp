const { Schema, model } = require("mongoose");

// Schema
const orderSchema = new Schema({
    buyerUserProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    sellerBusinessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
    customOfferId: { type: Schema.Types.ObjectId, ref: "CustomOffer" },
    status: String,
    totalAmount: Number
}, { timestamps: true });

// Model
const Order = model("Order", orderSchema);

module.exports = Order;