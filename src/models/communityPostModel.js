const { Schema, model } = require("mongoose");

// Schema
const communityPostSchema = new Schema({
    // References
    communityId: { type:Schema.Types.ObjectId, ref:"Community", required:true },
    authorId: { type:Schema.Types.ObjectId, required:true, refPath:'authorModel' },
    authorModel: { type:String, required:true, enum:['UserProfile', 'BusinessProfile'] },

    // Content
    content: { type: String, required: true, trim: true },
    type: { type: String, enum: ['post', 'document', 'event', 'poll', 'file'], default: 'post'},

    // Files
    file: {
        url: { type: String },
        name: { type: String },
        size: { type: Number },
        mimeType: { type: String },  
    },

    images: { type: [String], default: [] },
    docId: { type:String },

    // Event Details
    event: {
        name: { type: String, trim: true },
        description: { type: String, trim: true },
        date: { type: Date },
        location: { type: String, trim: true }
    },

    // Meta tags for mentioning fellows
    tags: { type: String, trim: true },

    // Share to
    shareTo: { type:String, enum:['public', 'private'], default: 'public' },

    // Engagements
    // Likes
    likes: [{
        userId: { type: Schema.Types.ObjectId, refPath: 'likes.onModel' },
        onModel: { type: String, enum: ['UserProfile', 'BusinessProfile'] },
        likedAt: { type: Date, default: Date.now }
    }],
    
    // Comments
    comments: [{
        userId: { type: Schema.Types.ObjectId, refPath: 'comments.onModel' },
        onModel: { type: String, enum: ['UserProfile', 'BusinessProfile'] },
        content: String,
        commentedAt: { type: Date, default: Date.now }
    }],

    // Counters
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0},

    // Flag
    isEdited: { type: Boolean, default: false }
}, { timestamps: true });

// Indexes
communityPostSchema.index({ communityId: 1, createdAt: -1 });
communityPostSchema.index({ authorUserProfileId: 1 });

// Model
const CommunityPost = model("CommunityPost", communityPostSchema);

module.exports = CommunityPost;