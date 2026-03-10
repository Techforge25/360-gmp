const { Schema, model } = require("mongoose");

// Schema
const planFeatureLimitSchema = new Schema({
    // References
    planId: { type:Schema.Types.ObjectId, ref:"Plan", required:true },
    featureId: { type:Schema.Types.ObjectId, ref:"Feature", required:true },

    // Limit
    maxAllowed: { type:Number, default: -1 } // -1 = unlimited for premium
}, { timestamps:true });

// Model
const PlanFeatureLimit = model("PlanFeatureLimit", planFeatureLimitSchema);

module.exports = PlanFeatureLimit;