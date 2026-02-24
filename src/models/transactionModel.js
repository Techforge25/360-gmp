const { Schema, model } = require("mongoose");

// Schema
const transactionSchema = new Schema({
    // Owner dynamic reference
    ownerId:{ type:Schema.Types.ObjectId, required:true, refPath:"ownerModel" },
    ownerModel:{ type:String, required:true, enum:["BusinessProfile", "UserProfile"] },

    // Order reference (Optional when deposit)
    orderId: { type:Schema.Types.ObjectId, ref:"Order", default:null },

    // Balance info
    amount:{ type:Number, required:true },
    type:{ type:String, default:"deposit", enum:["buy", "deposit", "refund"] },

    // Transaction details
    paymentMethod:{ type:String, default:"stripe", enum:["stripe", "wallet"] },
    stripeSessionId: { type:String, default:null },
    status:{ type:String, default:"pending", enum:["pending", "failed", "completed"] }
}, { timestamps: true });

// Model
const Transaction = model("Transaction", transactionSchema);

module.exports = Transaction;