const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const userProfileSchema = new Schema({
    // Basic info
    userId: { type:Schema.Types.ObjectId, ref:"User", required:true, unique:[true, "You have already created a user profile"] },
    fullName: { type:String, required:true, trim:true },

    // Contact info
    email:{ type:String, required:true, trim:true, lowercase:true, unique:[true, "This email has already been taken"] },
    phone: { type:String, trim:true, unique:[true, "This contact number has already been taken"] },
    location: { type:String, trim:true },

    // Media files url
    resumeUrl: { type:String, trim:true },
    logo: { type:String, trim:true },
    banner: { type:String, trim:true },

    // Personal
    bio: { type:String, trim:true },
    skills: [String],
    stripeConnectId: { type:String, trim:true, default:null },

    // For Job Application
    title: { type:String, trim:true, required:true },
    targetJob: String,
    employmentType: [String],
    minSalary: Number,
    maxSalary: Number,

    // Education fields
    education: {
      institution: String,
      degree: String,
      fieldOfStudy: String,
      startDate: Date,
      endDate: Date,
      isCurrent: { type: Boolean, default: false },
      description: String,
      grade: String
    },
    isVerified: { type: Boolean, default: false },

    // Account restriction
    cancellationCount: { type:Number, default:0 }, // Consecutive cancellations
    lastCancellationAt: { type:Date, default:null }, // Last cancel time
    accountFrozenUntil: { type:Date, default:null } // Freeze expiry    
}, { timestamps: true });

// Add pagination plugin
userProfileSchema.plugin(aggregatePaginate);

// Model
const UserProfile = model("UserProfile", userProfileSchema);

module.exports = UserProfile;