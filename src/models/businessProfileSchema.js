const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

const BusinessProfileSchema = new Schema({
    // Basic info
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    ownerName: { type:String, trim:true, required:true }, // New
    identificationOfBusinessOwner: { type:String, trim:true }, // New
    companyName: { type: String, required: true, trim: true, unique:[true, "This Company name has already been registered"] },
    tradeName: { type: String, trim: true }, // New: Optional trade name
    businessType: { type: String, trim: true },
    companySize: { type: String, trim: true },
    foundedDate: { type:Date },
    primaryIndustry: { type: String, trim: true },
    stripeConnectId: { type: String, trim: true, default:null },
    operationHour: { type: String, trim: true },
    countryOfRegistration: { type: String, trim: true },

    // Legal & Compliance
    businessRegistrationNumber: { type: String, trim: true }, // New
    taxIdentificationNumber: { type: String, trim: true }, // TIN / VAT / EIN
    dunsNumber: { type: String, trim: true }, // New (Data Universal Numbering System for international trade credibility)
    complianceScreeningStatus: { type: Boolean, required:true }, // AML/PEP results

    // Location  
    location: {
      country: { type: String, trim: true },
      city: { type: String, trim: true },
      addressLine: { type: String, trim: true },
      warehouseAddress: { type: String, trim: true }, // New
      additionalWarehouseAddress: { type: String, trim: true }, // New
      mandatoryPickupAddress: { type: String, trim: true }, // New
      businessRegistrationAddress: { type: String, trim: true, required:true }, // New
      internationalOffices: { type:[String] },
    },
    incoterms: { type: String, trim: true }, // New (International Commercial Terms)

    // Shipping info
    shipping: {
      capabilities:{ type:[String] },
      exportExperience:{ type:Boolean, default:false }
    },

    // Ownership & Leadership
    executiveLeadership: { type: [String], default: [] }, // New: CEO, MD, Officers
    stakeholderDisclosure: [{
        name: { type: String, trim: true },
        ownershipPercentage: { type: Number, min: 0, max: 100 }
    }], // New

    // Operational & Trade Profile
    regionOfOperations: { type:[String] }, // New
    productionCapacity: { type: String, trim: true }, // New
    tradeAffiliations: { type: [String], default: [] }, // New

    // Financial & Regulatory Data
    annualRevenueRange: { type: String, trim: true }, // New
    auditingAgency: { type: String, trim: true }, // CPA or firm

    // Documentation & Verification Assets
    certificateOfIncorporation: { type: String, trim: true }, // file path
    taxRegistrationCertificate: { type: String, trim: true }, // file path

    // Product Packaging Defaults (Logistics Prep)
    standardProductDimensions: {
        length: { type: Number, default: 0 },
        width: { type: Number, default: 0 },
        height: { type: Number, default: 0 },
        weight: { type: Number, default: 0 },
    }, // New

    // Other certifications (ISO 9001)
    certifications:{ type:[String], default:[] },

    // B2B contact  
    b2bContact: {
      name: { type: String, trim: true },
      title: { type: String, trim: true },
      phone: { type: String, trim: true, unique:[true, "This contact number has already been taken"] },
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
BusinessProfileSchema.plugin(aggregatePaginate);

// Model
const BusinessProfile = model("BusinessProfile", BusinessProfileSchema);

module.exports = BusinessProfile;