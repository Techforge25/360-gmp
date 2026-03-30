const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2")

// Schema
const subscriptionHistorySchema = new Schema({
    // References
    userId: { type:Schema.Types.ObjectId, ref:"User" },
    planId: { type:Schema.Types.ObjectId, ref:"Plan" },

    // Other info
    invoiceId:{ type:String, trim:true, default:null },
    status: { type:String, enum: ["pending", "paid", "failed", "deleted"], default: "pending" }
}, { timestamps:true });

// Add pagination plugin
subscriptionHistorySchema.plugin(aggregatePaginate);

const SubscriptionHistory = model("SubscriptionHistory", subscriptionHistorySchema);

module.exports = SubscriptionHistory;