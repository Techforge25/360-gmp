const joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9\s\-.'&+()]*$/;
const countryPattern = /^[a-zA-Z]*$/;
const addressPattern = /^[a-zA-Z0-9 -,]*$/;
const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;
const stackHoldersNamePattern = /^[a-zA-Z]*$/;

// Update company identity validator
const updateCompanyIdentityValidator = joi.object({
    ownerName: joi.string().min(3).max(200).trim().required().pattern(alphaNumericPattern).label("Owner name"),
    identificationOfBusinessOwner: joi.string().min(3).max(200).trim().required().pattern(alphaNumericPattern).label("Identification of business owner"),
    companyName: joi.string().min(5).max(200).trim().required().pattern(alphaNumericPattern).label("Company name"),
    tradeName: joi.string().max(200).trim().required().pattern(alphaNumericPattern).label("Trade name"),
    businessType: joi.string().max(50).trim().required().pattern(alphaNumericPattern).label("Business type"),
    companySize: joi.string().trim().required().pattern(alphaNumericPattern).label("Company size"),
    foundedDate: joi.date().max('now').allow(null),
    primaryIndustry: joi.string().trim().allow("", null).pattern(alphaNumericPattern).label("Primary industry"),
    operationHour: joi.string().trim().allow("", null).label("Operation hours"),
    countryOfRegistration: joi.string().max(50).trim().required().pattern(countryPattern).label("Country of registration"),

    // Web and description
    website: joi.string().uri().max(100).trim().allow("", null).label("Website"),
    description: joi.string().trim().max(5000).allow("", null).label("Business description"),

    // Legal & Compliance
    businessRegistrationNumber: joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Business registration number"),
    taxIdentificationNumber: joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Tax identification number"),
    dunsNumber: joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Data Universal Numbering System"),
    complianceScreeningStatus: joi.boolean().default(true).label("Compliance screening status"), 
});

// Operations and logistics validator
const operationsAndLogisticsValidator = joi.object({
    location: joi.object({
        country: joi.string().max(100).trim().allow("", null).pattern(countryPattern).label("Country"),
        city: joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("City"),
        addressLine: joi.string().max(1000).trim().allow("", null).label("Address line"),
        warehouseAddress: joi.string().max(1000).trim().allow("", null).label("Warehouse Address"),
        additionalWarehouseAddress: joi.string().max(1000).trim().allow("", null).label("Additional Warehouse Address"),
        mandatoryPickupAddress: joi.string().max(1000).trim().allow("", null).label("Mandatory Pickup Address"),
        businessRegistrationAddress: joi.string().max(1000).trim().allow("", null).label("Business Registration Address"),
        internationalOffices: joi.array().items(joi.string().pattern(addressPattern)).label("International Offices")      
    }),

    // International Commercial Terms
    incoterms: joi.string().max(500).trim().allow("", null).pattern(alphaNumericPattern).label("International Commercial Terms"),

    // Shipping info
    shipping: {
        capabilities:joi.array().items(joi.string().pattern(alphaNumericPattern)).max(10).label("Shipping Capabilities")
    },
    
    // Product Packaging Defaults (Logistics Prep)
    standardProductDimensions: joi.object({
        length: joi.number().min(0).default(0).label("Product dimension length"),
        width: joi.number().min(0).default(0).label("Product dimension width"),
        height: joi.number().min(0).default(0).label("Product dimension height"),
        weight: joi.number().min(0).default(0).label("Product dimension weight"),
    })
});

// Update business intelligence validator
const updateBusinessIntelligenceValidator = joi.object({
    // B2B
    b2bContact: joi.object({
        name: joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("B2B Name"),
        title: joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("B2B Title"),
        phone: joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
            "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
        }).label("Phone"),
        supportEmail: joi.string().trim().email().lowercase().allow("", null).label("Support email")        
    }),

    // Ownership & Leadership
    executiveLeadership: joi.array().items(joi.string().pattern(alphaNumericPattern)).max(50).label("Executive Leadership"),
    stakeholderDisclosure: joi.array().items(joi.object({
        name: joi.string().trim().min(3).pattern(alphaNumericPattern).label("Stake holder name"),
        ownershipPercentage: joi.number().integer().min(0).max(100).positive().label("Ownership percentage")
    })),  
        
    // Operational & Trade Profile   
    regionOfOperations: joi.array().items(joi.string().pattern(alphaNumericPattern)).label("Region of operations"),  
    productionCapacity: joi.string().trim().max(1000).optional().pattern(customPattern).label("Production capacity"),  
    tradeAffiliations: joi.array().items(joi.string().pattern(alphaNumericPattern)).label("Trade Affiliations"),  
    
    // Financial & Regulatory Data
    auditingAgency: joi.string().trim().optional().pattern(alphaNumericPattern).label("Auditing agency")     
});

// Update certificates
const updateBusinessCertifactesValidator = joi.object({
    certificateOfIncorporation: joi.string().trim().optional().uri().label("Certificate of incorporation"),
    taxRegistrationCertificate: joi.string().trim().optional().uri().label("Certificate of tax registration"),
    certifications: joi.array().items(joi.string().trim().uri()).label("Certifications")
});

module.exports = { updateCompanyIdentityValidator, operationsAndLogisticsValidator, 
updateBusinessIntelligenceValidator, updateBusinessCertifactesValidator };