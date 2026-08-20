const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const communitySchema = new Schema({
    // Basic info
    businessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile", required: true },
    name: { type: String, trim: true, required: true },
    category: { type: String, trim: true },
    type: { type: String, enum: ["public", "private"], default: "public", required: true },
    description: { type: String, trim: true },
    purpose: { type: String, trim: true },
    rules: { type: String, trim: true },

    // Media settings
    coverImage: { type: String, default: null },
    profileImage: { type: String, default: null },

    // Security
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
    memberCount: { type: Number, default: 0 }
}, { timestamps: true });

// Inject plugin
communitySchema.plugin(paginate);
communitySchema.plugin(aggregatePaginate);

// Model
const Community = model("Community", communitySchema);

module.exports = Community;