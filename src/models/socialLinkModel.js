const { Schema, model } = require("mongoose");

// Schema
const socialLinkSchema = new Schema({
    platform: { type: String, required: [true, "Platform is required"] },
    url: { type:String, required:[true, "URL is required"] },
    businessProfileId: { type:Schema.Types.ObjectId, ref:"BusinessProfile" }
}, { timestamps: true });

// Model
const SocialLink = model("SocialLink", socialLinkSchema);

module.exports = SocialLink;