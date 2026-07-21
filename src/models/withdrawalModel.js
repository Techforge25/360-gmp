const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const withdrawalSchema = new Schema({
    ownerId: { type: Schema.Types.ObjectId, required: true, refPath: "ownerModel" },
    ownerModel: { type: String, enum: ["BusinessProfile", "UserProfile"], required: true },
    amount: Number,
    currency: String,
    stripeTransferId: String,
    status: { type: String, enum: ["pending", "completed", "failed"], default: "pending" }
}, { timestamps: true });

// Paginate
withdrawalSchema.plugin(paginate);
withdrawalSchema.plugin(aggregatePaginate);

// Model
const Withdrawal = model("Withdrawal", withdrawalSchema);

module.exports = Withdrawal;