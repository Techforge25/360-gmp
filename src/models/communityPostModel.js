const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const communityPostSchema = new Schema({
    // References
    communityId: { type:Schema.Types.ObjectId, ref:"Community", required:true },
    authorId: { type:Schema.Types.ObjectId, refPath:'authorModel', required:true },
    authorModel: { type:String, enum:['UserProfile', 'BusinessProfile'], required:true, index:true },

    // Post Type
    type: { type: String, enum: ['post', 'document'], default: 'post', required: true },

    // Content
    content: { type: String, trim: true },
    
    // File (For docs and images)
    file: { type: String, trim: true }
}, { timestamps: true });

// Indexes
communityPostSchema.index({ communityId: 1 });
communityPostSchema.index({ authorUserProfileId: 1 });

// Add pagination plugin
communityPostSchema.plugin(aggregatePaginate);

// Model
const CommunityPost = model("CommunityPost", communityPostSchema);

module.exports = CommunityPost;