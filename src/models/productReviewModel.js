const { Schema, model } = require("mongoose");

// Schema
const productReviewSchema = new Schema({
    // References
    userProfileId: { type:Schema.Types.ObjectId, ref:"UserProfile", required:true },
    productId: { type:Schema.Types.ObjectId, ref:"Product", required:true },

    // Review info
    rating: { type:Number, min:1, max:5, required:true },
    comment:{ type:String, trim:true, required:true },
    images:[{ type:String, trim:true }]
});

// Model
const ProductReview = model("ProductReview", productReviewSchema);

module.exports = ProductReview;