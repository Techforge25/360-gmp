const { Schema, model } = require("mongoose");

// Schema
const walletSchema = new Schema({
    // Owner reference
    ownerId:{ type:Schema.Types.ObjectId, required:true, refPath:"ownerModel" },
    ownerModel:{ type:String, required:true, enum:["BusinessProfile", "UserProfile"] },

    // Balance info
    pendingBalance:{ type:Number, default:0 },
    availableBalance:{ type:Number, default:0 },
    totalEarned:{ type:Number, default:0 },
    currency:{ type:String, default:"USD" }
}, { timestamps: true });

// Model
const Wallet = model("Wallet", walletSchema);

module.exports = Wallet;