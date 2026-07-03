const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const BusinessProfileSchema = new Schema({
    /* REFERENCING & STRIPE CONNECTION */ 
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    stripeConnectId: { type: String, trim: true, default:null }, // For withdrawal

    /* BASIC IDENTITY & LEGAL */ 
    ownerName: { type:String, trim:true, required:true }, 
    companyName: { type: String, required: true, trim: true, unique:[true, "This Company name has already been registered"] },
    tradeName: { type: String, trim: true },
    businessRegistrationNumber: { type: String, trim: true, unique: [true, "This business registration number has already taken"] },
    taxIdentificationNumber: { type: String, trim: true, unique:[true, "This tax identification number has already been taken"] }, // TIN / VAT / EIN
    dunsNumber: { type: String, trim: true }, // New (Data Universal Numbering System for international trade credibility)
    countryOfRegistration: { type: String, trim: true },
    businessType: { type: String, trim: true },
    primaryIndustry: { type: String, trim: true },
    foundedDate: { type:Date },
    companySize: { type: String, trim: true },
    operationHour: { type: String, trim: true },
    website: { type: String, trim: true },
    description: { type:String },
    logo: { type:String },
    banner: { type:String },     

    /* BUSINESS OPERATION */  
    // Head office address
    headOffice:{
      country: { type: String, trim: true },
      city: { type: String, trim: true },
      addressLine: { type: String, trim: true },      
    },

    // Warehouse address
    warehouseAddress:{
      country: { type: String, trim: true },
      city: { type: String, trim: true },
      addressLine: { type: String, trim: true },       
    },

    // Additional warehouse address
    additionalWarehouseAddress:[{
      country: { type: String, trim: true },
      city: { type: String, trim: true },
      addressLine: { type: String, trim: true },        
    }],

    // New (International Commercial Terms)
    incoterms: { type: String, trim: true }, 
    termsAndCapability: { type:String, trim:true },

    /* INTERNATIONAL OFFICES */
    internationalOffices: [{
      officeName: { type:String, trim:true },
      country: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      addressLine: { type: String, trim: true },
      zipCode: { type:String, trim:true }
    }],

    /* BUSINESS INTELLIGENCE & LEADERSHIP */
    primaryContactPerson: {
      name: { type: String, trim: true },
      title: { type: String, trim: true },
      phone: { type: String, trim: true, unique:[true, "This contact number has already been taken"] },
      supportEmail: { type: String, trim: true, lowercase: true }      
    },

    /* EXECUTIVE LEADERSHIP & STAKEHOLDER */
    executiveAndLeadership: [{
      name: { type:String, trim:true, required:true },
      ownershipPercentage: { type:Number, required:true },
      role: { type:String, trim:true, required:true },

      // If ownership percentage is less than 25%
      votingRights: { type:[String] }, 

      // If ownership percentage is equal or greater than 25% (Apply KYC)
      kyc: {
        dob: { type:Date },
        nationality: { type: String, trim: true },
        phone: { type: String, trim: true },
        residentialAddress: { type: String, trim: true },
        governmentIdType: { type: String, trim: true, enum:["National ID", "Passport", "Driving License"] },
        idNumber: { type: String, trim: true },

        // Media files (Documents)
        idFront: { type: String, trim: true },
        idBack: { type: String, trim: true },
        proofOfResidentialAddress: { type: String, trim: true },
        proofOfOwnership: { type: String, trim: true }
      },
    }], 

    ownedByAnotherCompany: { type: Boolean, default: false },
    // Parent company details if incase owned by another comapany
    parentCompany: {
      companyName: { type: String, trim: true },
      ownershipPercentage: { type: String, trim: true },
      countryOfIncorporation: { type: String, trim: true }
    },

    /* OPERATIONAL & TRADE PROFILE */
    operationalAndTradeProfile: {
      auditingAgency: { type: String, trim: true },
      regionOfOperations: { type: [String], default: [] },
      tradeAffiliations: { type: [String], default: [] },
    },

    /* AML & TRANSACTION PROFILE */
    amlAndTransactionProfile: {
      purpose: { type: String, trim: true },
      revenueRange: { type: String, trim: true },
      mainCounterParties: { type: [String] },
      tradeCorridors: { type: [String] },
      pep: { type: Boolean, default: false } // Is politically expose person
    },

    /* REQUIRED DOCUMENTS */
    certificateOfIncorporation: { type: String, trim: true },
    taxRegistrationCertificate: { type: String, trim: true },
    shareHolderRegister: { type: String, trim: true },
    operatingLicense: { type: String, trim: true },

    // Other
    isVerified: { type: Boolean, default: false },
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

// Inject plugin
BusinessProfileSchema.plugin(paginate);
BusinessProfileSchema.plugin(aggregatePaginate);

// Model
const BusinessProfile = model("BusinessProfile", BusinessProfileSchema);

module.exports = BusinessProfile;