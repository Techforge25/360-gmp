const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const postCommentSchema = new Schema({
    // References
    postId: { type: Schema.Types.ObjectId, ref: "CommunityPost" },
    commenterId: { type: Schema.Types.ObjectId, refPath: "commenterModel", required: true },
    commenterModel: { type: String, enum: ['UserProfile', 'BusinessProfile'], required: true }
}, { timestamps: true });

// Add pagination plugin
postCommentSchema.plugin(aggregatePaginate);

// Model
const PostComment = model("PostComment", postCommentSchema);

module.exports = PostComment;