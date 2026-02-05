const { Schema, model } = require("mongoose");

// Schema
const walletTransactionSchema = new Schema({
    // Owner reference
    ownerId:{ type:Schema.Types.ObjectId, required:true, refPath:"ownerModel" },
    ownerModel:{ type:String, required:true, enum:["BusinessProfile", "UserProfile"] },

    // Balance info
    amount:{ type:Number, required:true },
    type:{ type:String, default:"deposit", enum:["buy", "deposit", "refund"] },

    // Transaction details
    paymentMethod:{ type:String, default:"stripe", enum:["stripe", "wallet"] },
    stripeSessionId: { type:String, default:null },
    status:{ type:String, default:"pending", enum:["pending", "failed", "completed"] }
}, { timestamps: true });

// Model
const WalletTransaction = model("WalletTransaction", walletTransactionSchema);

module.exports = WalletTransaction;