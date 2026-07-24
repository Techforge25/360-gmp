const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const reportSchema = new Schema({
    // Reference
    userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
    reportedContentId: { type: Schema.Types.ObjectId, refPath: "reportedModel", required: true },
    reportedModel: { type: String, enum: ["BusinessProfile", "Product", "Job", "Community"], required: true },

    // Content
    reason: { type: String, trim: true, required: true },
    media: { type:[String] },
    description: { type: String, trim: true, required: true }
}, { timestamps: true });

// Inject plugin
reportSchema.plugin(aggregatePaginate);

// Model
const Report = model("Report", reportSchema);

module.exports = Report;