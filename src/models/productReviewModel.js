const { Schema, model } = require("mongoose");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const productReviewSchema = new Schema({
    // References
    userProfileId: { type:Schema.Types.ObjectId, ref:"UserProfile", required:true },
    productId: { type:Schema.Types.ObjectId, ref:"Product", required:true, index:true },

    // Review info
    rating: { type:Number, min:1, max:5, required:true },
    comment: { type:String, trim:true, required:true },
    images: [{ type:String, trim:true }]
}, { timestamps:true });

// Inject plugin
productReviewSchema.plugin(aggregatePaginate);

// Model
const ProductReview = model("ProductReview", productReviewSchema);

module.exports = ProductReview;