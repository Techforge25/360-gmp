const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

// Schema
const userSchema = new Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  status: { type: String, default: "active" }
}, { timestamps: true });

// Hash password
userSchema.pre("save", async function(next) {
    if(!this.isModified("passwordHash")) return next();
    try 
    {
        this.passwordHash = await bcrypt.hash(this.passwordHash, 10);
    } 
    catch(error) 
    {
        console.log("Failed to hash user password", error.message);
    }
});

// Match password
userSchema.methods.matchPassword = async function(password) {
    if(!password) return false;
    try 
    {
       return await bcrypt.compare(password, this.password); 
    } 
    catch (error) 
    {
        console.log(error.message);
        return false;
    }
}

// Model
const User = model("User", userSchema);

module.exports = User;