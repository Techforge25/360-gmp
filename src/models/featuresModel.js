const { Schema, model } = require("mongoose");

// Schema
const featureSchema = new Schema({
    name: { type:String, trim:true, required:true, unique:true, },
    description: { type:String, trim:true }
}, { timestamps:true });

// Model
const Feature = model("Feature", featureSchema);

module.exports = Feature;