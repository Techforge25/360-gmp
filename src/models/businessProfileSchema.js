const { Schema, model } = require("mongoose");

const BusinessProfileSchema = new Schema({
    // Basic info
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    companyName: { type: String, required: true, trim: true },
    businessType: { type: String, trim: true },
    companySize: { type: String, trim: true },
    foundedDate: { type:Date },
    primaryIndustry: { type: String, trim: true },
    stripeConnectId: { type: String, trim: true },
    operationHour: { type: String, trim: true },

    // Location  
    location: {
      country: { type: String, trim: true },
      city: { type: String, trim: true },
      addressLine: { type: String, trim: true }
    },

    // Certifications array
    certifications: {
      type: [String],
      default: []
    },

    // B2B contact  
    b2bContact: {
      name: { type: String, trim: true },
      title: { type: String, trim: true },
      phone: { type: String, trim: true },
      supportEmail: {
        type: String,
        trim: true,
        lowercase: true
      }
    },

    // Branding info
    website: { type: String, trim: true },
    description: { type:String },
    logo: { type:String },
    banner: { type:String },
    isVerified: { type: Boolean, default: false },
    isLocked: { type: Boolean, default: true },
    mapURL: { type:String }
}, { timestamps: true });

// Indexes that actually matter
BusinessProfileSchema.index({ "location.country": 1 });
BusinessProfileSchema.index({ isVerified: 1 });

// Model
const BusinessProfile = model("BusinessProfile", BusinessProfileSchema);

module.exports = BusinessProfile;
