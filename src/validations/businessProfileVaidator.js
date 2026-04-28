const Joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9 -]*$/;
const addressPattern = /^[a-zA-Z0-9 -,]*$/;
const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;
const operatingHourPattern = /^\d{1,2}(:\d{2})?\s?(am|pm)\s?-\s?\d{1,2}(:\d{2})?\s?(am|pm)$/i;

// Location schema
const locationSchema = Joi.object({
    country: Joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Country"),
    city: Joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("City"),
    addressLine: Joi.string().max(1000).trim().allow("", null).label("Address line"),
    warehouseAddress: Joi.string().max(1000).trim().allow("", null).label("Warehouse Address"),
    additionalWarehouseAddress: Joi.string().max(1000).trim().allow("", null).invalid(Joi.ref('warehouseAddress')).label("Additional Warehouse Address"),
    mandatoryPickupAddress: Joi.string().max(1000).trim().allow("", null).label("Mandatory Pickup Address"),
    businessRegistrationAddress: Joi.string().max(1000).trim().allow("", null).label("Business Registration Address"),
    internationalOffices: Joi.array().items(Joi.string().pattern(addressPattern)).label("International Offices")
});

// B2B Contact schema
const b2bContactSchema = Joi.object({
    name: Joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("B2B Name"),
    title: Joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("B2B Title"),
    phone: Joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
        "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
    }).label("Phone"),
    supportEmail: Joi.string().trim().email().lowercase().allow("", null).label("Email")
});

// Create Business Profile schema
const createBusinessProfileSchema = Joi.object({
    ownerName: Joi.string().min(3).max(200).required().trim().pattern(alphaNumericPattern).label("Owner name"),
    identificationOfBusinessOwner: Joi.string().min(3).max(200).required().trim().label("Identification of business owner"),
    companyName: Joi.string().min(5).max(200).required().trim().pattern(alphaNumericPattern).label("Business name"),
    tradeName: Joi.string().max(200).trim().optional().pattern(alphaNumericPattern).label("Trade name"),
    businessType: Joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("Business type"),
    companySize: Joi.string().trim().allow("", null).pattern(alphaNumericPattern).label("Company size"),
    foundedDate: Joi.date().max("now").allow(null).label("Founded date"),
    primaryIndustry: Joi.string().max(500).trim().allow("", null).pattern(alphaNumericPattern).label("Primary industry"),
    operationHour: Joi.string().max(50).trim().pattern(operatingHourPattern).allow("", null).label("Operation hours"),
    countryOfRegistration: Joi.string().max(50).trim().allow("", null).label("Country of registration"),

    // Legal & Compliance
    businessRegistrationNumber: Joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Business registration number"),
    taxIdentificationNumber: Joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Tax identification number"),
    dunsNumber: Joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Data Universal Numbering System"),
    complianceScreeningStatus: Joi.boolean().default(true).label("Compliance screening status"),

    // Location info
    location: locationSchema.allow(null).label("Location"),

    // International Commercial Terms
    incoterms: Joi.string().max(500).trim().allow("", null).pattern(alphaNumericPattern).label("International Commercial Terms"),

    // Shipping info
    shipping: {
        capabilities:Joi.array().items(Joi.string().pattern(alphaNumericPattern)).max(10).label("Shipping Capabilities"),
        exportExperience: Joi.boolean().required().label("Export experience")
    },

    // Ownership & Leadership
    executiveLeadership: Joi.array().items(Joi.string().pattern(alphaNumericPattern)).max(50).label("Executive Leadership"),
    stakeholderDisclosure: Joi.array().items(Joi.object({
        name: Joi.string().trim().min(3).required().pattern(alphaNumericPattern).label("Stake holder name"),
        ownershipPercentage: Joi.number().integer().min(0).max(100).positive().label("Ownership percentage")
    })),

    // Operational & Trade Profile   
    regionOfOperations: Joi.array().items(Joi.string().pattern(alphaNumericPattern)).label("Region of operations"),  
    productionCapacity: Joi.string().trim().max(1000).optional().pattern(customPattern).label("Production capacity"),   
    tradeAffiliations: Joi.array().items(Joi.string().pattern(alphaNumericPattern)).label("Trade Affiliations"),

    // Financial & Regulatory Data
    annualRevenueRange: Joi.string().trim().optional().label("Annual revenue range"),
    auditingAgency: Joi.string().trim().optional().label("Auditing agency"),

    // Documentation & Verification Assets
    certificateOfIncorporation: Joi.string().trim().optional().uri().label("Certificate of incorporation"),
    taxRegistrationCertificate: Joi.string().trim().optional().uri().label("Certificate of tax registration"),

    // Product Packaging Defaults (Logistics Prep)
    standardProductDimensions: Joi.object({
        length: Joi.number().min(0).default(0).label("Product dimension length"),
        width: Joi.number().min(0).default(0).label("Product dimension width"),
        height: Joi.number().min(0).default(0).label("Product dimension height"),
        weight: Joi.number().min(0).default(0).label("Product dimension weight"),
    }),

    // Other Certifications & B2B Contact
    certifications: Joi.array().items(Joi.string().trim().uri()).min(1).max(3).default([]).label("Certification"),
    b2bContact: b2bContactSchema.allow(null).label("B2B Contact"),

    // Website & description
    website: Joi.string().uri().max(100).trim().allow("", null).label("Website"),
    description: Joi.string().trim().max(5000).allow("", null).label("Business description"),
    
    // Media
    logo: Joi.string().trim().uri().allow("", null).label("Logo"),
    banner: Joi.string().trim().uri().allow("", null).label("Banner")
});

// Update Business Profile schema (all fields optional)
const updateBusinessProfileSchema = Joi.object({
    ownerName: Joi.string().min(3).max(200).trim().required().pattern(alphaNumericPattern).label("Owner name"),
    identificationOfBusinessOwner: Joi.string().min(3).max(200).trim().required().label("Identification of business owner"),
    companyName: Joi.string().min(5).max(200).trim().required().pattern(alphaNumericPattern).label("Company name"),
    tradeName: Joi.string().max(200).trim().optional().pattern(alphaNumericPattern).label("Trade name"),
    businessType: Joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("Business type"),
    companySize: Joi.string().trim().allow("", null).pattern(alphaNumericPattern).label("Company size"),
    foundedDate: Joi.date().max("now").allow(null),
    primaryIndustry: Joi.string().trim().allow("", null).pattern(alphaNumericPattern).label("Primary industry"),
    operationHour: Joi.string().trim().pattern(operatingHourPattern).allow("", null).label("Operation hours"),
    countryOfRegistration: Joi.string().max(50).trim().allow("", null).label("Country of registration"),

    // Legal & Compliance
    businessRegistrationNumber: Joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Business registration number"),
    taxIdentificationNumber: Joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Tax identification number"),
    dunsNumber: Joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Data Universal Numbering System"),
    complianceScreeningStatus: Joi.boolean().default(true).label("Compliance screening status"),

    // Location info
    location: locationSchema.allow(null).label("Location"),

    // International Commercial Terms
    incoterms: Joi.string().max(500).trim().allow("", null).pattern(alphaNumericPattern).label("International Commercial Terms"),

    // Shipping info
    shipping: {
        capabilities:Joi.array().items(Joi.string().pattern(alphaNumericPattern)).max(10).label("Shipping Capabilities"),
        exportExperience: Joi.boolean().label("Export experience")
    },

    // Ownership & Leadership
    executiveLeadership: Joi.array().items(Joi.string().pattern(alphaNumericPattern)).max(50).label("Executive Leadership"),
    stakeholderDisclosure: Joi.array().items(Joi.object({
        name: Joi.string().trim().min(3).pattern(alphaNumericPattern).label("Stake holder name"),
        ownershipPercentage: Joi.number().integer().min(0).max(100).positive().label("Ownership percentage")
    })),  
    
    // Operational & Trade Profile   
    regionOfOperations: Joi.array().items(Joi.string().pattern(alphaNumericPattern)).label("Region of operations"),  
    productionCapacity: Joi.string().trim().max(1000).optional().pattern(customPattern).label("Production capacity"),  
    tradeAffiliations: Joi.array().items(Joi.string().pattern(alphaNumericPattern)).label("Trade Affiliations"),

    // Financial & Regulatory Data
    annualRevenueRange: Joi.string().trim().optional().label("Annual revenue range"),
    auditingAgency: Joi.string().trim().optional().pattern(alphaNumericPattern).label("Auditing agency"),   
    
    // Documentation & Verification Assets
    certificateOfIncorporation: Joi.string().trim().optional().uri().label("Certificate of incorporation"),
    taxRegistrationCertificate: Joi.string().trim().optional().uri().label("Certificate of tax registration"),    

    // Product Packaging Defaults (Logistics Prep)
    standardProductDimensions: Joi.object({
        length: Joi.number().min(0).default(0).label("Product dimension length"),
        width: Joi.number().min(0).default(0).label("Product dimension width"),
        height: Joi.number().min(0).default(0).label("Product dimension height"),
        weight: Joi.number().min(0).default(0).label("Product dimension weight"),
    }),    

    // Other Certifications & B2B Contact
    certifications: Joi.array().items(Joi.string().trim().uri()).min(1).max(3).label("Certifications"),
    b2bContact: b2bContactSchema.allow(null),
    
    // Website & description
    website: Joi.string().uri().trim().max(100).allow("", null).label("Website"),
    description: Joi.string().trim().max(5000).allow("", null).label("Business description"),
    
    // Media
    logo: Joi.string().trim().uri().allow("", null).label("Logo"),
    banner: Joi.string().trim().uri().allow("", null).label("Banner")
});

// Gallery validation schema
const galleryValidationSchema = Joi.object({
    albumName: Joi.string().trim().min(3).max(50).required().pattern(alphaNumericPattern).label("Album Name"),
    description: Joi.string().trim().max(1000).allow("", null).label("Album Description"),
    images: Joi.array().items(Joi.string().uri().trim()).min(1).max(8).default([]).label("Album Images")
});

// Update gallery validation schema
const updateGalleryValidationSchema = Joi.object({
    albumName: Joi.string().trim().min(3).max(50).required().pattern(alphaNumericPattern).label("Album Name"),
    description: Joi.string().trim().max(1000).allow("", null).label("Album Description")
});

module.exports = { createBusinessProfileSchema, updateBusinessProfileSchema, 
galleryValidationSchema, updateGalleryValidationSchema };
