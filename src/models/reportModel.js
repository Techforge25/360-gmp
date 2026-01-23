const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const reportSchema = new Schema({
    // Reference
    reporterId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reportedModel: { type: String, required:true, enum: ["Job", "Community", "CommunityPost"] },
    reportedContentId: { type: Schema.Types.ObjectId, required:true, refPath:"reportedModel" },
    reportedCommentId: { type: Schema.Types.ObjectId, default: null },

    // Details
    subject: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    evidences: [{ type: String }],
    status: { type: String, enum: ["pending", "reviewed", "resolved", "rejected"], default: "pending" }
}, { timestamps: true });

// Inject plugin
reportSchema.plugin(aggregatePaginate);

// Model
const Report = model("Report", reportSchema);

module.exports = Report;