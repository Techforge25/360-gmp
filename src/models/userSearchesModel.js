const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");

// Schema
const userSearchesSchema = new Schema({
    userId: { type:Schema.Types.ObjectId, ref:"User", required:true },
    searchedContent: { type:String, trim:true, required:true }
}, { timestamps:true });

// Inject plugin
userSearchesSchema.plugin(paginate);

// Model
const UserSearches = model("UserSearches", userSearchesSchema);

module.exports = UserSearches;