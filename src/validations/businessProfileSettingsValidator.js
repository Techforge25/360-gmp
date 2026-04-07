const joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9 -]*$/;
const addressPattern = /^[a-zA-Z0-9 -,]*$/;
const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;
const stackHoldersNamePattern = /^[a-zA-Z]*$/;

// Update company identity validator
const updateCompanyIdentityValidator = joi.object({
    ownerName: joi.string().min(3).max(200).trim().pattern(alphaNumericPattern).label("Owner name"),
    identificationOfBusinessOwner: joi.string().min(3).max(200).trim().pattern(alphaNumericPattern).label("Identification of business owner"),
    companyName: joi.string().min(5).max(200).trim().pattern(alphaNumericPattern).label("Company name"),
    tradeName: joi.string().max(200).trim().optional().pattern(alphaNumericPattern).label("Trade name"),
    businessType: joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("Business type"),
    companySize: joi.string().trim().allow("", null).pattern(alphaNumericPattern).label("Company size"),
    foundedDate: joi.date().allow(null),
    primaryIndustry: joi.string().trim().allow("", null).pattern(alphaNumericPattern).label("Primary industry"),
    operationHour: joi.string().trim().allow("", null).label("Operation hours"),
    countryOfRegistration: joi.string().max(50).trim().allow("", null).pattern(alphaNumericPattern).label("Country of registration"),

    // Web and description
    website: joi.string().uri().max(100).trim().allow("", null).label("Website"),
    description: joi.string().trim().max(5000).allow("", null).label("Business description"),

    // Legal & Compliance
    businessRegistrationNumber: joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Business registration number"),
    taxIdentificationNumber: joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Tax identification number"),
    dunsNumber: joi.string().max(100).trim().allow("", null).pattern(alphaNumericPattern).label("Data Universal Numbering System"),
    complianceScreeningStatus: joi.boolean().default(true).label("Compliance screening status"),

    // Media
    logo: joi.string().trim().uri().allow("", null).label("Logo"),
    banner: joi.string().trim().uri().allow("", null).label("Banner")    
});

module.exports = { updateCompanyIdentityValidator };