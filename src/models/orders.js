const { Schema, model } = require("mongoose");

// Schema
// const orderSchema = new Schema({
//     buyerUserProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
//     sellerBusinessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
//     conversationId: { type: Schema.Types.ObjectId, ref: "Conversation" },
//     customOfferId: { type: Schema.Types.ObjectId, ref: "CustomOffer" },
//     status: String,
//     totalAmount: Number
// }, { timestamps: true });

// Updated Schema
const orderSchema = new Schema({
    buyerUserProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    sellerBusinessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    totalAmount: { type: Number },
    status: { 
        type: String,
        enum: ["pending", "paid", "processing", "shipped", "delivered", "completed", "cancelled"],
        default: "pending" 
    },
    shippingAddress: { type:String },
    items:[{
        _id:false,
        productId: { type: Schema.Types.ObjectId, ref:"Product", required:[true, "Product ID is required"] },
        quantity: { type: Number, required:[true, "Please specify product quantity"] },
        priceAtPurchase: { type: Number, required:[true, "Please specify product price at purchase"] }
    }]
}, { timestamps: true });

// Model
const Order = model("Order", orderSchema);

module.exports = Order;