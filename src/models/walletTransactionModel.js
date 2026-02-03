const { Schema, model } = require("mongoose");

// Schema
const walletTransactionSchema = new Schema({
    // Owner reference
    ownerId:{ type:Schema.Types.ObjectId, required:true, refPath:"ownerModel", unique:true },
    ownerModel:{ type:String, required:true, enum:["BusinessProfile", "UserProfile"] },

    // Balance info
    amount:{ type:Number, required },
    type:{ type:String, default:"deposit" },
    stripeSessionId: { type:String, default:null },
    status:{ type:String, default:"pending", enum:["pending", "failed", "completed"] }
}, { timestamps: true });

// Model
const WalletTransaction = model("Wallet", walletTransactionSchema);

module.exports = WalletTransaction;