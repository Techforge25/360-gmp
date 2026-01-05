const { Schema, model } = require("mongoose");

// Schema
const jobApplicationSchema = new Schema({
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    resumeUrl: String,
    status: String
}, { timestamps: true });

// Model
const JobApplication = model("JobApplication", jobApplicationSchema);

module.exports = JobApplication;