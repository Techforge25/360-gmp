const { Schema, model } = require("mongoose");

// Schema
const gallerySchema = new Schema({
    businessProfileId: { type: Schema.Types.ObjectId, ref:"BusinessProfile", required:true },
    albumName: { type: String, required:true },
    description: { type: String, default:null },
    images: [{ type: String }]
}, { timestamps: true });

// Model
const Gallery = model("Gallery", gallerySchema);

module.exports = Gallery;