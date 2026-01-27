const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");

// Schema
const supportSchema = new Schema({
    userId:{ type:Schema.Types.ObjectId, ref:"User", required:true },
    subject:{ type:String, trim:true, required:true },
    category:{ type:String, trim:true, required:true },
    description:{ type:String, trim:true, required:true },
    fileType:{ type:String, trim:true },
    fileURL:{ type:String, trim:true }
}, { timestamps:true });

// Inject plugin
supportSchema.plugin(paginate);

// Model
const Support = model("Support", supportSchema);

module.exports = Support;