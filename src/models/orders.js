const { Schema, model } = require("mongoose");

// Items sub-schema (embedded in Order)
const orderItemSchema = new Schema({
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    name: { type: String, required: true },
    priceAtPurchase: { type: Number, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: String
}, { _id: false });

// Main Order Schema
const orderSchema = new Schema({
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    totalAmount: { type: Number, required: true },
    orderStatus: { 
        type: String, 
        enum: ["Pending", "Processing", "Confirmed", "Shipped", "Delivered", "Cancelled"],
        default: "Processing"
    },
    shippingAddress: { type: String, required: true },
    items: [orderItemSchema], // Embedded items array
    paymentStatus: {
        type: String,
        enum: ["Pending", "Completed", "Failed", "Refunded"],
        default: "Pending"
    },
    paymentId: String, // Stripe payment intent/session ID
    stripeSessionId: String, // Stripe checkout session ID
    // Escrow related
    escrowStatus: {
        type: String,
        enum: ["pending", "held", "released", "refunded"],
        default: "held"
    },
    escrowTransactionId: { type: Schema.Types.ObjectId, ref: "EscrowTransaction" },
    // Seller business info (from products)
    sellerBusinessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    sellerStripeAccountId: String // For direct transfer
}, { timestamps: true });

// Model
const Order = model("Order", orderSchema);

module.exports = Order;