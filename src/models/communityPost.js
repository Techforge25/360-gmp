const { Schema, model } = require("mongoose");


// Schema
const communityPostSchema = new Schema({
    communityId: { type: Schema.Types.ObjectId, ref: "Community" },
    authorUserProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    content: String,
    docId: String
}, { timestamps: true });

// Model
const CommunityPost = model("CommunityPost", communityPostSchema);

module.exports = CommunityPost;