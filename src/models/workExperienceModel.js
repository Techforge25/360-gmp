const { Schema, model } = require("mongoose");

// Schema
const workExperienceSchema = new Schema({
    userProfileId: { type:Schema.Types.ObjectId, ref:"UserProfile", required:true },
    jobTitle: { type:String, trim:true, required:true },
    employmentType: [{ type:String, trim:true }],
    companyName: { type:String, trim:true, required:true },
    startDate: { type:Date, required:true },
    endDate: { type:Date },
    location: { type:String, trim:true, required:true },
    description: { type:String, trim:true },
    isCurrentlyWorking: { type:Boolean, default:false },
}, { timestamps:true });

// Model
const WorkExperience = model("WorkExperience", workExperienceSchema);

module.exports = WorkExperience;