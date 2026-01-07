const { Schema, model } = require("mongoose");

// Schema
const communityMembershipSchema = new Schema({
    communityId: { 
        type: Schema.Types.ObjectId, 
        ref: "Community",
        required: true 
    },
    userProfileId: { 
        type: Schema.Types.ObjectId, 
        ref: "UserProfile",
        required: true 
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
communityMembershipSchema.index({ communityId: 1, userProfileId: 1 }, { unique: true });
communityMembershipSchema.index({ userProfileId: 1 });
communityMembershipSchema.index({ status: 1 });

// Model
const CommunityMembership = model("CommunityMembership", communityMembershipSchema);

module.exports = CommunityMembership;