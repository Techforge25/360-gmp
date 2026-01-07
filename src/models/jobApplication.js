const { Schema, model } = require("mongoose");

// Schema
const jobApplicationSchema = new Schema({
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    resumeUrl: { type:String, required:[true, "Resume is required"] },
    portfolioLink: { type:String },
    yearsOfExperience: { type: Number },
    immediateJoiningStatus: { type:String },
    expectedSalary: { type:String }
}, { timestamps: true });

// Model
const JobApplication = model("JobApplication", jobApplicationSchema);

module.exports = JobApplication;