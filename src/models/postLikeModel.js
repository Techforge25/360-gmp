const { Schema, model } = require("mongoose");

// Schema
const postLikeSchema = new Schema({
    // References
    postId: { type: Schema.Types.ObjectId, ref: "CommunityPost" },
    likerId: { type: Schema.Types.ObjectId, refPath: "likerModel", required: true },
    likerModel: { type: String, enum: ['UserProfile', 'BusinessProfile'], required: true }
}, { timestamps: true });

// Model
const PostLike = model("PostLike", postLikeSchema);

module.exports = PostLike;