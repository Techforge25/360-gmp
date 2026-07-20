const joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9\s\-.'&]*$/;
const ownerNamePattern = /^[a-zA-Z\s\-.']*$/;
const countryPattern = /^[a-zA-Z\s-]*$/;
const cityPattern = /^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ])[A-Za-z0-9À-ÖØ-öø-ÿ\s\-'.]+$/;
const addressPattern = /^(?![0-9\s,.\-/#]+$)[a-zA-Z0-9\s,.\-/#]+$/;
const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;
const operatingHourPattern = /^(0?[1-9]|1[0-2])(AM|PM|am|pm)\s-\s(0[1-9]|1[0-2])(AM|PM|am|pm)$/;
const alphaNumericWithHyphen = /^[A-Za-z0-9-]+$/;
const websitePattern = /^https?:\/\/.+$/;
const dunsPattern = /^\d{9}$/;
const contactNamePattern = /^[A-Za-z\s\-.']*$/;
const titlePattern = /^[A-Za-z\s\-&]*$/;
const phonePattern = /^[\d+\\s()]+$/;
const tradeAffiliationPattern = /^[A-Za-z0-9 -]*$/;
const auditingAgencyPattern = /^[A-Za-z0-9\s,\-&]*$/;
const emailPattern = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,63}$/;
const primaryIndustryPattern = /^[A-Za-z0-9\- &/]*$/;

// Critical
const identificationPattern = /^[A-Za-z0-9Ññ\- .\/&]+$/;

// Company Identity
const updateCompanyIdentityValidator = joi.object({
    ownerName: joi.string().pattern(ownerNamePattern).min(2).max(100).trim().required().label("Owner name"),
    identificationOfBusinessOwner: joi.string().pattern(identificationPattern).min(5).max(20).trim().required().label("Identification of business owner"),
    companyName: joi.string().pattern(alphaNumericPattern).min(3).max(50).trim().required().label("Company name"),
    tradeName: joi.string().pattern(alphaNumericPattern).min(2).max(150).trim().optional().allow("", null).label("Trade name"),
    businessType: joi.string().trim().required().invalid("select").label("Business type"),
    companySize: joi.string().trim().required().invalid("select").label("Company size"),
    foundedDate: joi.date().max('now').min('1800-01-01').allow(null),
    primaryIndustry: joi.string().pattern(primaryIndustryPattern).min(2).max(100).trim().allow("", null).label("Primary industry"),
    operationHour: joi.string().max(100).trim().allow("", null).pattern(operatingHourPattern).label("Operation hours"),
    countryOfRegistration: joi.string().trim().required().invalid("select").label("Country of registration"),
    website: joi.string().pattern(websitePattern).min(8).max(225).trim().allow("", null).label("Website"),
    description: joi.string().trim().min(10).max(5000).allow("", null).label("Business description"),
    businessRegistrationNumber: joi.string().pattern(identificationPattern).min(5).max(20).trim().required().label("Business registration number"),
    taxIdentificationNumber: joi.string().pattern(identificationPattern).min(5).max(20).trim().required().label("Tax identification number"),
    dunsNumber: joi.string().pattern(dunsPattern).length(9).trim().allow("", null).label("Data Universal Numbering System"),
    complianceScreeningStatus: joi.boolean().default(true).label("Compliance screening status"),
});

module.exports = { updateCompanyIdentityValidator };