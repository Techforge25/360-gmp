const { Schema, model } = require("mongoose");

// Schema
const communityMembershipSchema = new Schema({
    communityId: { type: Schema.Types.ObjectId, ref: "Community" },
    userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    role: String,
    joinedAt: { type: Date, default: Date.now }
});


// Model
const CommunityMembership = model("CommunityMembership", communityMembershipSchema);

module.exports = CommunityMembership;