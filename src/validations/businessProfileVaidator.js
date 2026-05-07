const Joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9 -]*$/;
const addressPattern = /^[a-zA-Z0-9 -,]*$/;
const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;
const ownerNamePattern = /^[a-zA-Z\s\-.']*$/;
const operatingHourPattern = /^(0?[1-9]|1[0-2])(AM|PM|am|pm)\s-\s(0[1-9]|1[0-2])(AM|PM|am|pm)$/;
const contactNamePattern = /^[A-Za-z\s\-.']*$/;
const tradeAffiliationPattern = /^[A-Za-z0-9 -]*$/;
const auditingAgencyPattern = /^[A-Za-z0-9\s,\-&]*$/;
const cityPattern = /^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ])[A-Za-z0-9À-ÖØ-öø-ÿ\s\-'.]+$/;
const primaryIndustryPattern = /^[A-Za-z0-9\- &/]*$/;

// Critical
const identificationPattern = /^[A-Za-z0-9Ññ\- .\/&]+$/;

// Location schema
const locationSchema = Joi.object({
    country: Joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Country"),
    city: Joi.string().max(100).trim().allow("", null).pattern(cityPattern).label("City"),
    addressLine: Joi.string().min(10).max(500).trim().allow("", null).label("Address line"),
    warehouseAddress: Joi.string().min(10).max(500).trim().allow("", null).label("Warehouse Address"),
    additionalWarehouseAddress: Joi.string().min(10).max(500).trim().allow("", null).invalid(Joi.ref('warehouseAddress')).label("Additional Warehouse Address"),
    mandatoryPickupAddress: Joi.string().min(10).max(500).trim().allow("", null).label("Mandatory Pickup Address"),
    businessRegistrationAddress: Joi.string().min(10).max(500).trim().allow("", null).label("Business Registration Address"),
    internationalOffices: Joi.array().items(Joi.string().trim().max(500).pattern(addressPattern)).label("International Offices")
});

// B2B Contact schema
const b2bContactSchema = Joi.object({
    name: Joi.string().max(50).trim().allow("", null).pattern(contactNamePattern).label("B2B Name"),
    title: Joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("B2B Title"),
    phone: Joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
        "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
    }).label("Phone"),
    supportEmail: Joi.string().trim().email().lowercase().required().label("Support Email")
});

// Create Business Profile schema
const createBusinessProfileSchema = Joi.object({
    ownerName: Joi.string().min(3).max(200).required().trim().pattern(ownerNamePattern).label("Owner name"),
    identificationOfBusinessOwner: Joi.string().min(5).max(20).pattern(identificationPattern).required().trim().label("Identification of business owner"),
    companyName: Joi.string().min(5).max(200).required().trim().pattern(alphaNumericPattern).label("Business name"),
    tradeName: Joi.string().max(200).trim().optional().pattern(alphaNumericPattern).label("Trade name"),
    businessType: Joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("Business type"),
    companySize: Joi.string().trim().allow("", null).pattern(alphaNumericPattern).label("Company size"),
    foundedDate: Joi.date().max("now").allow(null).label("Founded date"),
    primaryIndustry: Joi.string().max(500).trim().allow("", null).pattern(primaryIndustryPattern).label("Primary industry"),
    operationHour: Joi.string().max(50).trim().pattern(operatingHourPattern).allow("", null).label("Operation hours"),
    countryOfRegistration: Joi.string().max(50).trim().allow("", null).label("Country of registration"),

    // Legal & Compliance
    businessRegistrationNumber: Joi.string().min(5).max(20).trim().required().pattern(identificationPattern).label("Business registration number"),
    taxIdentificationNumber: Joi.string().min(5).max(20).trim().required().pattern(identificationPattern).label("Tax identification number"),
    dunsNumber: Joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Data Universal Numbering System"),
    complianceScreeningStatus: Joi.boolean().default(true).label("Compliance screening status"),

    // Location info
    location: locationSchema.allow(null).label("Location"),

    // International Commercial Terms
    incoterms: Joi.string().max(500).trim().allow("", null).pattern(alphaNumericPattern).label("International Commercial Terms"),

    // Shipping info
    shipping: {
        capabilities:Joi.array().items(Joi.string().pattern(alphaNumericPattern)).max(10).label("Shipping Capabilities"),
        exportExperience: Joi.boolean().default(false).label("Export experience")
    },

    // Ownership & Leadership
    executiveLeadership: Joi.array().min(1).items(Joi.string().pattern(contactNamePattern)).min(2).max(100).label("Executive Leadership"),
    
    stakeholderDisclosure: Joi.array().min(1).items(Joi.object({
        name: Joi.string().pattern(contactNamePattern).min(2).max(100).trim().label("Stake holder name"),
        ownershipPercentage: Joi.number().min(1).max(100).precision(2).label("Ownership percentage")
    })).custom((value, helpers) => {
        const totalOwnership = value.reduce((sum, stakeholder) => {
            return sum + (stakeholder.ownershipPercentage || 0);
        }, 0);

        if(Number(totalOwnership.toFixed(2)) !== 100)
        {
            return helpers.message("Total ownership percentage of all stakeholders must equal 100%");
        }

        return value;
    }),    

    // Operational & Trade Profile   
    regionOfOperations: Joi.array().items(Joi.string().pattern(alphaNumericPattern)).label("Region of operations"),  
    productionCapacity: Joi.string().trim().max(1000).optional().pattern(customPattern).label("Production capacity"),   
    tradeAffiliations: Joi.array().min(1).max(5).items(Joi.string().pattern(tradeAffiliationPattern).min(2).max(100)).label("Trade Affiliations"),

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
    }).label("Standard product dimension"),

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
    ownerName: Joi.string().min(3).max(200).trim().required().pattern(ownerNamePattern).label("Owner name"),
    identificationOfBusinessOwner: Joi.string().min(3).max(200).trim().required().label("Identification of business owner"),
    companyName: Joi.string().min(5).max(200).trim().required().pattern(alphaNumericPattern).label("Company name"),
    tradeName: Joi.string().max(200).trim().optional().pattern(alphaNumericPattern).label("Trade name"),
    businessType: Joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("Business type"),
    companySize: Joi.string().trim().allow("", null).pattern(alphaNumericPattern).label("Company size"),
    foundedDate: Joi.date().max("now").allow(null),
    primaryIndustry: Joi.string().trim().allow("", null).pattern(primaryIndustryPattern).label("Primary industry"),
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
