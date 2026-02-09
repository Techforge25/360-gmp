const { Schema, model } = require("mongoose");

// Schema
const reviewInviteSchema = new Schema({
    businessId: { type:Schema.Types.ObjectId, ref:"BusinessProfile", required:true, index:true },
    token: { type:String, required:true, unique: true, index:true },

    // Customer basic info (optional)
    customerName: { type:String, trim:true },
    customerEmail: { type:String, trim:true },

    // Invite status
    isUsed: { type:Boolean, default:false },
    usedAt: { type:Date },
    expiresAt: { type:Date }
}, { timestamps:true });

// Model
const ReviewInvite = model("ReviewInvite", reviewInviteSchema);

module.exports = ReviewInvite;