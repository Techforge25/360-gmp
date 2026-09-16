const { Schema, model } = require("mongoose");
const { allowedFeatureNames } = require("../constants");

// Schema
const featureSchema = new Schema({
    // Reference
    planId: { type: Schema.Types.ObjectId, ref: "Plan" },

    // Info
    name: { type: String, required: true, enum: allowedFeatureNames, index: true, unique: true },
    limit: { type: Number, default: 0 },
    isInfinite: { type: Boolean, default: false }
}, { timestamps: true });

// Model
const Feature = model("Feature", featureSchema);

module.exports = Feature;