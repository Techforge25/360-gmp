const { Schema, model } = require("mongoose");

// Schema
const communityPostSchema = new Schema({
    communityId: { 
        type: Schema.Types.ObjectId, 
        ref: "Community",
        required: true 
    },
    authorUserProfileId: { 
        type: Schema.Types.ObjectId, 
        ref: "UserProfile",
        required: true 
    },
    content: {
        type: String,
        required: true,
        trim: true
    },
    images: {
        type: [String],
        default: []
    },
    docId: String,
    likes: [{
        userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
        likedAt: { type: Date, default: Date.now }
    }],
    comments: [{
        userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
        content: String,
        commentedAt: { type: Date, default: Date.now }
    }],
    likeCount: {
        type: Number,
        default: 0
    },
    commentCount: {
        type: Number,
        default: 0
    },
    isEdited: {
        type: Boolean,
        default: false
    },
    editedAt: Date
}, { timestamps: true });

// Indexes
communityPostSchema.index({ communityId: 1, createdAt: -1 });
communityPostSchema.index({ authorUserProfileId: 1 });

// Model
const CommunityPost = model("CommunityPost", communityPostSchema);

module.exports = CommunityPost;