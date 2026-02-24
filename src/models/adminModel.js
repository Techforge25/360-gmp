const { Schema, model } = require("mongoose");

// Schema
const adminSchema = new Schema({
    username: { type:String, trim:true, lowercase:true, required:true, unique:[true, "This username has already been taken by another admin"] },
    password: { type:String, trim:true, required:true },
    role: { type:String, enum:["admin", "super-admin"], default:"admin" }
});

// Model
const Admin = model("Admin", adminSchema);

module.exports = { Admin };