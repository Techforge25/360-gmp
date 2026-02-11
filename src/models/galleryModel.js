const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");

// Schema
const gallerySchema = new Schema({
    businessProfileId: { type: Schema.Types.ObjectId, ref:"BusinessProfile", required:true },
    albumName: { type: String, required:true },
    description: { type: String, default:null },
    images: [{ type: String }]
}, { timestamps: true });

// Inject pagination plugin
gallerySchema.plugin(paginate);

// Model
const Gallery = model("Gallery", gallerySchema);

module.exports = Gallery;