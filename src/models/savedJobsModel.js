const { Schema, model } = require("mongoose");

// Schema
const savedJobSchema = new Schema({
    userId:{ type:Schema.Types.ObjectId, ref:"User" },
    jobId:{ type:Schema.Types.ObjectId, ref:"Job" }
}, { timestamps:true });

// Model
const SavedJob = model("SaveJob", savedJobSchema);

module.exports = SavedJob;