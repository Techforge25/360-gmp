const { Schema, model } = require("mongoose");

// Schema
const communityWarningSchema = new Schema({
    // References
    adminId: { type: Schema.Types.ObjectId, ref: "Admin", required: true },
    communityId: { type: Schema.Types.ObjectId, ref: "Community", required: true },

    // Details
    reason: { type: String, trim: true, required: true },
    description: { type: String, trim: true }
}, { timestamps: true });

// Model
const CommunityWarning = model("CommunityWarning", communityWarningSchema);

module.exports = CommunityWarning;