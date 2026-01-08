const { Schema, model } = require("mongoose");

// Schema

const walletSchema = new Schema({
    businessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile", required: true, unique: true },
    pendingBalance: { type: Number, default: 0 },    
    availableBalance: { type: Number, default: 0 }, 
    totalEarned: { type: Number, default: 0 },       
    currency: { type: String, default: "USD" }
}, { timestamps: true });

const Wallet = model("Wallet", walletSchema);

module.exports = Wallet;