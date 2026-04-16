const { Schema, model } = require("mongoose");

// Schema
const reviewInviteSchema = new Schema({
    businessId: { type:Schema.Types.ObjectId, ref:"BusinessProfile", required:true, index:true },
    inviteToken: { type:String, required:true, unique: true, index:true },

    // Invite status
    isUsed: { type:Boolean, default:false },
}, { timestamps:true });

// Model
const ReviewInvite = model("ReviewInvite", reviewInviteSchema);

module.exports = ReviewInvite;