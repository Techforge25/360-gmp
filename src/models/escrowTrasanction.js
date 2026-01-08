const { Schema, model } = require("mongoose");

// Schema
const escrowTransactionSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: "usd" },
    status: {
        type: String,
        enum: ["pending", "held", "released", "refunded", "failed"],
        default: "pending"
    },
    // Stripe Connect related
    paymentIntentId: { type: String, required: true },
    transferId: String, // Stripe transfer ID when released to seller
    refundId: String, // Stripe refund ID if refunded
    // Seller info
    sellerBusinessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile", required: true },
    sellerStripeAccountId: String, // Stripe Connect account ID
    // Buyer info
    buyerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    // Release conditions
    releaseCondition: {
        type: String,
        enum: ["order_delivered", "order_confirmed", "manual_release", "auto_release"],
        default: "order_delivered"
    },
    releasedAt: Date,
    refundedAt: Date,
    // Notes
    releaseNotes: String,
    refundReason: String
}, { timestamps: true });

// Indexes
escrowTransactionSchema.index({ status: 1 });
escrowTransactionSchema.index({ sellerBusinessId: 1 });
escrowTransactionSchema.index({ buyerUserId: 1 });

// Model
const EscrowTransaction = model("EscrowTransaction", escrowTransactionSchema);

module.exports = EscrowTransaction;