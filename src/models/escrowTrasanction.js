const { Schema, model } = require("mongoose");

// Schema
const escrowTransactionSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    sellerId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    buyerId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    totalAmount: Number,
    platformFee: Number,   // Aapka 10% ($10)
    netAmount: Number, 
    status: { 
        type: String, 
        enum: ['held', 'released', 'refunded'], 
        default: 'held' 
    },
    // releaseCondition: String
}, { timestamps: true });

// Model
const EscrowTransaction = model("EscrowTransaction", escrowTransactionSchema);

module.exports = EscrowTransaction;