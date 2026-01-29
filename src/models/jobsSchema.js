const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

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
    status: { type:String, enum:["open", "paused", "closed"], default:"open" },

    // Views
    viewedBy: [{ type:Schema.Types.ObjectId, ref:"User" }],
    viewsCount: { type:Number, default:0 },   
}, { timestamps: true });

// Inject plugin
jobSchema.plugin(paginate);
jobSchema.plugin(aggregatePaginate);

// Model
const Job = model("Job", jobSchema);

module.exports = Job;