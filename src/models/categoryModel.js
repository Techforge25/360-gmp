const { Schema, model } = require("mongoose");

// Schema
const categorySchema = new Schema({
    title:{ type:String, required:true, trim:true, index:true },
    description:{ type:String, trim:true },
}, { timestamps:true });

// Model
const Category = model("Category", categorySchema);

module.exports = Category;