const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const transactionSchema = new Schema({
    // Owner dynamic reference
    ownerId:{ type:Schema.Types.ObjectId, required:true, refPath:"ownerModel" },
    ownerModel:{ type:String, required:true, enum:["BusinessProfile", "UserProfile"] },

    // Order reference (Optional when deposit)
    orderId: { type:Schema.Types.ObjectId, ref:"Order", default:null },

    // Balance info
    amount:{ type:Number, required:true },
    type:{ type:String, default:"deposit", enum:["buy", "sale", "deposit", "refund", "transfer", "dispute"] },

    // Transaction details
    paymentMethod:{ type:String, default:"stripe", enum:["stripe", "wallet"] },
    stripeSessionId: { type:String, default:null },
    status:{ type:String, default:"pending", enum:["pending", "failed", "completed"] }
}, { timestamps: true });

// Add pagination plugin
transactionSchema.plugin(paginate);
transactionSchema.plugin(aggregatePaginate);

// Model
const Transaction = model("Transaction", transactionSchema);

module.exports = Transaction;