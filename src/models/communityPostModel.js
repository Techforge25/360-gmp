const { Schema, model } = require("mongoose");

// Schema
const communityPostSchema = new Schema({
    // References
    communityId: { type:Schema.Types.ObjectId, ref:"Community", required:true },
    authorId: { type:Schema.Types.ObjectId, refPath:'authorModel', required:true },
    authorModel: { type:String, enum:['UserProfile', 'BusinessProfile'], required:true, index:true },

    // Post Type
    type: { type: String, enum: ['post', 'document', 'event', 'poll', 'file'], default:'post', required:true },

    // Content
    content: { type: String, trim:true },
    
    // Files
    file: {
        url: { type: String, trim: true },
        name: { type: String, trim: true },
        size: { type: Number },
        mimeType: { type: String, trim: true },  
    },

    // Event Details
    event: {
        name: { type: String, trim: true },
        description: { type: String, trim: true },
        date: { type: Date },
        location: { type: String, trim: true }
    },

    // Poll Details
    poll: {
        question: { type: String, trim: true },
        options: [{
            option: { type: String, trim: true },
            votes: { type: Number, default: 0 }
        }],
        duration: { type:Date }, // Duration in (1 day, 2 days, 3 days, 1 week, 2 weeks)
    },

    // Meta tags for mentioning fellows
    tags: { type: String, trim: true },

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
    isEdited: { type: Boolean, default: false },    

    // Other fields added by another Dev
    images: { type: [String], default: [] },
    docId: { type:String },
}, { timestamps: true });

// Indexes
communityPostSchema.index({ communityId: 1, createdAt: -1 });
communityPostSchema.index({ authorUserProfileId: 1 });

// Model
const CommunityPost = model("CommunityPost", communityPostSchema);

module.exports = CommunityPost;