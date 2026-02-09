const { Schema, model } = require("mongoose");

const testimonialSchema = new Schema({
    businessId: { type:Schema.Types.ObjectId, ref:"BusinessProfile", required:true, index:true },
    reviewInviteId: { type:Schema.Types.ObjectId, ref:"ReviewInvite", required:true, unique:true }, // One review per invite

    // Reviewer info
    reviewerName: { type:String, trim:true, required:true },
    reviewerEmail: { type:String, trim:true, required:true },

    // 1–5 stars
    rating: { type:Number, min:1, max:5, required:true },
    title: { type:String, trim:true },
    description: { type:String, trim:true, required:true }
}, { timestamps: true });

// Model
const Testimonial = model("Testimonial", testimonialSchema);

module.exports = Testimonial;