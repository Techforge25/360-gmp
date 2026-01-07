const { Schema, model } = require("mongoose");

// Schema
const jobSchema = new Schema({
    businessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    jobTitle: String,
    jobCategory: String,
    employmentType: String,
    experienceLevel: String,
    description: String,
    salaryMin: Number,
    salaryMax: Number,
    location: {
        country: String,
        city: String, 
    },
    status: String
}, { timestamps: true });

// Model
const Job = model("Job", jobSchema);

module.exports = Job;