const { Schema, model } = require("mongoose");

// Schema
const walletSchema = new Schema({
    ownerType: { type: String, enum: ["USER", "BUSINESS"] },
    ownerId: Schema.Types.ObjectId,
    balance: { type: Number, default: 0 }
}, { timestamps: true });

// Model
const Wallet = model("Wallet", walletSchema);

module.export = Wallet;