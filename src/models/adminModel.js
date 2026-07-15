const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

// Schema
const adminSchema = new Schema({
    username: { type:String, trim:true, lowercase:true, required:true, unique:[true, "This username has already been taken by another admin"] },
    password: { type:String, trim:true, required:true },
    role: { type:String, enum:["superAdmin", "admin"], default: "admin" },
    allowedModules: { type:[String], default: [] },
    refreshToken: { type: String, default: null }
});

// Hash password
adminSchema.pre("save", async function() {
    if(!this.isModified("password")) return;
    try 
    {
        this.password = await bcrypt.hash(this.password, 10);
    } 
    catch(error) 
    {
        console.log("Failed to hash admin password", error.message);
    }
});

// Match password
adminSchema.methods.matchPassword = async function(password) {
    if(!password) return false;
    try 
    {
       return await bcrypt.compare(password, this.password); 
    } 
    catch (error) 
    {
        console.log("Failed to compare passwords", error.message);
        return false;
    }
}

// Model
const Admin = model("Admin", adminSchema);

module.exports = Admin;