const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");

// Schema
const jobApplicationSchema = new Schema({
    jobId: { type: Schema.Types.ObjectId, ref: "Job" },
    userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    resumeUrl: { type:String, required:[true, "Resume is required"] },
    portfolioLink: { type:String },
    yearsOfExperience: { type: Number },
    immediateJoiningStatus: { type:String },
    expectedSalary: { type:String },
    status: { type:String, enum:["pending", "viewed", "accepted", "rejected"], default:"pending" }
}, { timestamps: true });

// Inject plugin
jobApplicationSchema.plugin(paginate);

// Model
const JobApplication = model("JobApplication", jobApplicationSchema);

module.exports = JobApplication;