const { Schema, model } = require("mongoose");

// Schema
const communitySchema = new Schema({
    businessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    name: String,
    category: String,
    privacy: String,
    description: String,
    purpose: String,
    tags: [String],
    rules: String
}, { timestamps: true });

// Model
const Community = model("Community", communitySchema);

module.exports = Community;