const { Schema, model } = require("mongoose");

// Schema
const userProfileSchema = new Schema({
  userId: { type:Schema.Types.ObjectId, ref: "User", required: true },
  fullName: String,
  title: String,
  phone: String,
  location: String,
  bio: String,
  resumeUrl: String,
  skills: [String],
  imageProfile: String
}, { timestamps: true });

// Model
const UserProfile = model("UserProfile", userProfileSchema);

module.exports = UserProfile;