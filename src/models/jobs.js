const { Schema, model } = require("mongoose");

// Schema
const jobSchema = new Schema({
    businessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    title: String,
    category: String,
    employmentType: String,
    experienceLevel: String,
    description: String,
    salaryMin: Number,
    salaryMax: Number,
    location: String,
    status: String
}, { timestamps: true });

// Model
const Job = model("Job", jobSchema);

module.exports = Job;