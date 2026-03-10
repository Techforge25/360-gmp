const { Schema, model } = require("mongoose");

// Schema
const usageSchema = new Schema({
    // References
    userId: { type:Schema.Types.ObjectId, ref:"User", required:true },
    featureId: { type: Schema.Types.ObjectId, ref:"Feature", required: true },

    // Used limit
    used: { type:Number, default:0 }
}, { timestamps:true });

// Model
const Usuage = model("Usage", usageSchema);

module.exports = Usuage;