const { Schema, model } = require("mongoose");

// Schema
const escrowTransactionSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    sellerId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    buyerId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    totalAmount: { type:Number },
    platformFee: { type:Number },   // Platform fee 10% ($10)
    netAmount: { type:Number }, // Business seller profile
    status: { type:String, enum:['held', 'released', 'refunded'], default:'held' },
    paymentMethod: { type:String, required:true, enum:["stripe", "wallet"] }
}, { timestamps: true });

// Model
const EscrowTransaction = model("EscrowTransaction", escrowTransactionSchema);

module.exports = EscrowTransaction;