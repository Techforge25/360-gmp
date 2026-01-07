const { Schema, model } = require("mongoose");

// Schema
const communitySchema = new Schema({
    businessId: { 
        type: Schema.Types.ObjectId, 
        ref: "BusinessProfile",
        required: true 
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        trim: true
    },
    type: {
        type: String,
        enum: ["public", "private", "featured"],
        default: "public",
        required: true
    },
    description: {
        type: String,
        trim: true
    },
    purpose: {
        type: String,
        trim: true
    },
    tags: {
        type: [String],
        default: []
    },
    rules: {
        type: String,
        trim: true
    },
    coverImage: String,
    profileImage: String,
    status: {
        type: String,
        enum: ["active", "inactive", "suspended"],
        default: "active"
    },
    memberCount: {
        type: Number,
        default: 0
    }
}, { timestamps: true });

// Indexes
communitySchema.index({ businessId: 1 });
communitySchema.index({ type: 1 });
communitySchema.index({ status: 1 });

// Model
const Community = model("Community", communitySchema);

module.exports = Community;