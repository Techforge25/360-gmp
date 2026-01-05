const { Schema, model } = require("mongoose");

// Schema
const BusinessProfileSchema = new Schema({
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    companyName: String,
    businessType: String,
    companySize: Number,
    foundedDate: Date,
    website: String,
    description: String,
    logo: String,
    banner: String,
    location: String,
    isVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: false }
}, { timestamps: true });

// Model
const BusinessProfile = model("BusinessProfile", BusinessProfileSchema);

module.exports = BusinessProfile;