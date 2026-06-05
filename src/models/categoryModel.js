const { Schema, model } = require("mongoose");

// Category Schema
const categorySchema = new Schema({
    title: { type:String, required:true, trim:true, index:true },
    description: { type:String, trim:true },
}, { timestamps: true });

// Subcategory Schema
const subCategorySchema = new Schema({
    categoryId: { type: Schema.Types.ObjectId, ref: "Category" },
    title:{ type:String, required:true, trim:true, index:true },
    description:{ type:String, trim:true },
}, { timestamps:true });

// Models
const Category = model("Category", categorySchema);
const Subcategory = model("Subcategory", subCategorySchema);

module.exports = { Category, Subcategory };