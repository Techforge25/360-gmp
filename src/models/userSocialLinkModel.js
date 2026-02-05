const { Schema, model } = require("mongoose");

// Schema
const userSocialLinkSchema = new Schema({
    platformName: { type: String, required: [true, "Platform is required"] },
    url: { type:String, required:[true, "URL is required"] },
    userProfileId: { type:Schema.Types.ObjectId, ref:"UserProfile" }
}, { timestamps: true });

// Model
const UserSocialLink = model("UserSocialLink", userSocialLinkSchema);

module.exports = UserSocialLink;