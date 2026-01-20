const { Schema, model } = require("mongoose");

// Schema
const categorySchema = new Schema({
    title:{ type:String, required:true },
    description:{ type:String }
}, { timestamps:true });

// Model
const Category = model("Category", categorySchema);

module.exports = Category;