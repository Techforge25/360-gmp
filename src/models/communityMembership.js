const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const communityMembershipSchema = new Schema({
    communityId: { 
        type: Schema.Types.ObjectId, 
        ref: "Community",
        required: true 
    },
    memberId: { 
        type: Schema.Types.ObjectId, 
        required: true, 
        refPath: 'memberModel' 
    },
    memberModel: {
        type: String,
        required: true,
        enum: ['UserProfile', 'BusinessProfile']
    },
    role: {
        type: String,
        enum: ["owner", "admin", "moderator", "member"],
        default: "member"
    },
    status: {
        type: String,
        enum: ["pending", "approved", "rejected"],
        default: "approved"
    },
    joinedAt: { 
        type: Date, 
        default: Date.now 
    },
    isPaid: {
        type: Boolean,
        default: false
    },
    paymentDate: Date
}, { timestamps: true });

// Indexes - Prevent duplicate memberships
communityMembershipSchema.index({ communityId: 1, memberId: 1 }, { unique: true });
communityMembershipSchema.index({ status: 1 });

// Add pagination plugin
communityMembershipSchema.plugin(aggregatePaginate);

// Model
const CommunityMembership = model("CommunityMembership", communityMembershipSchema);

module.exports = CommunityMembership;