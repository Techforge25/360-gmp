const { Schema, model } = require("mongoose");

// Schema
const userProfileSchema = new Schema({
    // Basic info
    userId: { type:Schema.Types.ObjectId, ref:"User", required:true, unique:[true, "You have already created a user profile"] },
    fullName: String,
    title: String,
    phone: String,
    location: String,
    bio: String,
    resumeUrl: String,
    skills: [String],
    imageProfile: String,
    stripeConnectId: { type:String, trim:true, default:null },

    // For Job Application
    targetJob: String,
    employmentType: [String],
    minSalary: Number,
    maxSalary: Number,

    // Education fields
    education: [{
      institution: String,
      degree: String,
      fieldOfStudy: String,
      startDate: Date,
      endDate: Date,
      isCurrent: { type: Boolean, default: false },
      description: String,
      grade: String
    }],
    isVerified: { type: Boolean, default: false }
}, { timestamps: true });

// Model
const UserProfile = model("UserProfile", userProfileSchema);

module.exports = UserProfile;