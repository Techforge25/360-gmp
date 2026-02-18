const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");

const BusinessProfileSchema = new Schema({
    // Basic info
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    companyName: { type: String, required: true, trim: true, unique:[true, "This Company name has already been registered"] },
    businessType: { type: String, trim: true },
    companySize: { type: String, trim: true },
    foundedDate: { type:Date },
    primaryIndustry: { type: String, trim: true },
    stripeConnectId: { type: String, trim: true, default:null },
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
    mapURL: { type:String },
    latitude: { type:Number, default:0 },
    longitude: { type:Number, default:0 },

    // Views
    viewedBy: [{
        userId: { type: Schema.Types.ObjectId, ref:"User" },
        viewedAt: { type: Date, default: Date.now }
    }],
    viewsCount: { type:Number, default:0 },

    // Gallery
    gallery: [{
      albumName: { type: String, trim: true },
      description: { type: String, trim: true },

      // Media files in the album
      images: {
        type: [String],

        // Custom validator to limit the number of images to 8
        validate: {
          validator: function (value) {
            return value.length <= 8;
          },
          message: "You can upload a maximum of 8 photos per album"
        }
      }
    }]
}, { timestamps: true });

// Indexes that actually matter
BusinessProfileSchema.index({ "location.country": 1 });
BusinessProfileSchema.index({ isVerified: 1 });

// Inject plugin
BusinessProfileSchema.plugin(paginate);

// Model
const BusinessProfile = model("BusinessProfile", BusinessProfileSchema);

module.exports = BusinessProfile;
