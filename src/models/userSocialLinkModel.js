const { Schema, model } = require("mongoose");

// Schema
const userSocialLinkSchema = new Schema({
    userProfileId: { type:Schema.Types.ObjectId, ref:"UserProfile", required:[true, "User profile ID is required"] },
    platformName: { type:String, required:[true, "Platform name is required"] },
    url: { type:String, required:[true, "URL is required"] },
}, { timestamps:true });

// Prevent duplicate platform per user
userSocialLinkSchema.index({ userProfileId:1, platformName:1 }, { unique:[true, "This social media platform has already been added to your profile."] });

// Model
const UserSocialLink = model("UserSocialLink", userSocialLinkSchema);

module.exports = UserSocialLink;