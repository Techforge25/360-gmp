const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const reportSchema = new Schema({
    // Reference
    userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
    type: { type: String, enum: ["BusinessProfile", "Product", "Job", "Community"], required: true },
    reason: { type: String, trim: true, required: true },
    description: { type: String, trim: true, required: true }
}, { timestamps: true });

// Inject plugin
reportSchema.plugin(aggregatePaginate);

// Model
const Report = model("Report", reportSchema);

module.exports = Report;