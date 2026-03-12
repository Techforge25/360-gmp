const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");

// Schema
const escrowTransactionSchema = new Schema({
    // Direct references
    orderId: { type:Schema.Types.ObjectId, ref:"Order", required:true },
    sellerId: { type:Schema.Types.ObjectId, ref:"BusinessProfile", required:true },
    buyerId: { type:Schema.Types.ObjectId, ref:"UserProfile", required:true },

    // Amount division
    totalAmount: { type:Number },
    platformFee: { type:Number }, // Platform fee 10% ($10)
    netAmount: { type:Number },   // Business seller profile's share

    // Status and payment method
    status: { type:String, enum:['held', 'released', 'refunded'], default:'held' },
    paymentMethod: { type:String, required:true, enum:["stripe", "wallet"] }
}, { timestamps: true });

// Paginate
escrowTransactionSchema.plugin(paginate);

// Model
const EscrowTransaction = model("EscrowTransaction", escrowTransactionSchema);

module.exports = EscrowTransaction;