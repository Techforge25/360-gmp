const { Schema, model } = require("mongoose");

// Schema
const reviewSchema = new Schema({
    orderId: { type: Schema.Types.ObjectId, ref: "Order" },
    userProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile" },
    businessProfileId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    rating: Number,
    comment: String
}, { timestamps: true });

// Model
const Review = model("Review", reviewSchema);

module.exports = Review;