const { Schema, model } = require("mongoose");
const bcrypt = require("bcrypt");

// Schema
const UserSchema = new Schema({
  email: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },
  status: { type: String, default: "active" }
}, { timestamps: true });

// Hash password
UserSchema.pre("save", async function(next) {
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

// Model
const User = model("User", UserSchema);

module.exports = User;