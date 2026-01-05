const { Schema, model } = require("mongoose");

// Schema
const escrowTransactionSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    amount: Number,
    status: String,
    releaseCondition: String
}, { timestamps: true });

// Model
const EscrowTransaction = model("EscrowTransaction", escrowTransactionSchema);

module.exports = EscrowTransaction;