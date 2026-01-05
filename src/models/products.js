const { Schema, model } = require("mongoose");

// Schema
const productSchema = new Schema({
    businessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    title: String,
    image: String,
    detail: String,
    category: String,
    pricePerUnit: Number,
    minOrderQty: Number,
    stockQty: Number,
    leadTime: Number,
    shippingTerms: String,
    isFeatured: Boolean
}, { timestamps: true });

// Model
const Product = model("Product", productSchema);

module.exports = Product;