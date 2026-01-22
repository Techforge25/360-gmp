const { Schema, model } = require("mongoose");

// Schema
const reportJobSchema = new Schema({
    jobId: { type:Schema.Types.ObjectId, ref:"Job", required:true },
    reporterId: { type:Schema.Types.ObjectId, ref:"User", required:true },
    subject: { type:String, required:true, trim:true },
    category: { type:String, required:true, trim:true },
    description: { type:String, required:true, trim:true },
    evidences:[{ type:String }] // Images path
}, { timestamps:true });

// Model
const ReportJob = model("ReportJob", reportJobSchema);

module.exports = ReportJob;