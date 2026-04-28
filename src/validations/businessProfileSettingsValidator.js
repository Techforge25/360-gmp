const joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9\s\-.'&]*$/;
const ownerNamePattern = /^[a-zA-Z\s\-.]*$/;
const countryPattern = /^[a-zA-Z\s-]*$/;
const cityPattern = /^[a-zA-Z\s-]*$/;
const addressPattern = /^[a-zA-Z0-9\s,.\-/#]*$/;
const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;
const operatingHourPattern = /^[0-9A-Za-z:\-\s,]+$/;
const alphaNumericWithHyphen = /^[A-Za-z0-9-]+$/;
const industryPattern = /^[A-Za-z\s-]*$/;
const registrationPattern = /^[A-Za-z0-9\-./]+$/;
const websitePattern = /^https?:\/\/.+$/;
const dunsPattern = /^\d{9}$/;
const contactNamePattern = /^[A-Za-z\s\-']*$/;
const titlePattern = /^[A-Za-z\s\-&]*$/;
const phonePattern = /^[\d+\-\s()]+$/;
const tradeAffiliationPattern = /^[A-Za-z0-9-]*$/;
const auditingAgencyPattern = /^[A-Za-z0-9\s,\-&]*$/;
const cloudinaryPattern = /^https?:\/\/res\.cloudinary\.com\/.+/i;

// Company Identity
const updateCompanyIdentityValidator = joi.object({
    ownerName: joi.string().pattern(ownerNamePattern).min(2).max(100).trim().required().label("Owner name"),
    identificationOfBusinessOwner: joi.string().pattern(alphaNumericWithHyphen).min(5).max(100).trim().required().label("Identification of business owner"),
    companyName: joi.string().pattern(alphaNumericPattern).min(2).max(150).trim().required().label("Company name"),
    tradeName: joi.string().pattern(alphaNumericPattern).min(2).max(150).trim().required().label("Trade name"),
    businessType: joi.string().trim().required().invalid("select").label("Business type"),
    companySize: joi.string().trim().required().invalid("select").label("Company size"),
    foundedDate: joi.date().max('now').min('1800-01-01').allow(null),
    primaryIndustry: joi.string().pattern(industryPattern).min(2).max(100).trim().allow("", null).label("Primary industry"),
    operationHour: joi.string().pattern(operatingHourPattern).max(100).trim().allow("", null).label("Operation hours"),
    countryOfRegistration: joi.string().trim().required().invalid("select").label("Country of registration"),
    website: joi.string().pattern(websitePattern).min(8).max(225).trim().allow("", null).label("Website"),
    description: joi.string().trim().min(10).max(5000).allow("", null).label("Business description"),
    businessRegistrationNumber: joi.string().pattern(registrationPattern).min(1).max(50).trim().allow("", null).label("Business registration number"),
    taxIdentificationNumber: joi.string().pattern(registrationPattern).min(1).max(50).trim().allow("", null).label("Tax identification number"),
    dunsNumber: joi.string().pattern(dunsPattern).length(9).trim().allow("", null).label("Data Universal Numbering System"),
    complianceScreeningStatus: joi.boolean().default(true).label("Compliance screening status"),
});

// Operations & Logistics
const operationsAndLogisticsValidator = joi.object({
    location: joi.object({
        country: joi.string().pattern(countryPattern).min(2).max(100).trim().required().label("Country"),
        city: joi.string().pattern(cityPattern).min(2).max(100).trim().required().label("City"),
        addressLine: joi.string().pattern(addressPattern).max(200).trim().required().label("Address line"),
        warehouseAddress: joi.string().pattern(addressPattern).max(200).trim().required().label("Warehouse Address"),
        additionalWarehouseAddress: joi.string().pattern(addressPattern).max(200).trim().allow("", null).label("Additional Warehouse Address"),
        additionalPickupAddress: joi.string().pattern(addressPattern).max(200).trim().allow("", null).label("Additional Pickup Address"),
        businessRegistrationAddress: joi.string().pattern(addressPattern).max(200).trim().required().label("Business Registration Address"),
        internationalOffices: joi.array().items(joi.string().pattern(addressPattern).max(200)).max(11).label("International Offices")
    }),
    incoterms: joi.string().trim().required().invalid("select").label("International Commercial Terms"),
    shipping: joi.object({
        capabilities: joi.array().items(joi.string().pattern(alphaNumericPattern)).max(10).label("Shipping Capabilities")
    }).required().label("Shipping"),

    standardProductDimensions: joi.object({
        length: joi.number().min(0).label("Product dimension length"),
        width: joi.number().min(0).label("Product dimension width"),
        height: joi.number().min(0).label("Product dimension height"),
        weight: joi.number().min(0).label("Product dimension weight"),
    })
});

// Business Intelligence
const updateBusinessIntelligenceValidator = joi.object({
    b2bContact: joi.object({
        name: joi.string().pattern(contactNamePattern).max(100).trim().required().label("Contact person name"),
        title: joi.string().pattern(titlePattern).max(100).trim().allow("", null).label("Title"),
        phone: joi.string().pattern(phonePattern).max(20).trim().required().label("Phone"),
        supportEmail: joi.string().trim().email().required().label("Support email")
    }),

    stakeholderDisclosure: joi.array().min(1).items(joi.object({
        name: joi.string().pattern(contactNamePattern).min(3).max(100).trim().label("Stake holder name"),
        ownershipPercentage: joi.number().min(1).max(100).precision(2).label("Ownership percentage")
    })),

    executiveLeadership: joi.array().min(1).max(10).items(joi.string().pattern(contactNamePattern).min(3).max(100)).label("Executive Leadership"),
    tradeAffiliations: joi.array().min(1).max(5).items(joi.string().pattern(tradeAffiliationPattern).min(3).max(100)).label("Trade Affiliations"),
    auditingAgency: joi.string().pattern(auditingAgencyPattern).min(3).max(100).trim().label("Auditing agency")
});

// Update certificates
const updateBusinessCertifactesValidator = joi.object({
    certificateOfIncorporation: joi.string().trim().optional().pattern(cloudinaryPattern).label("Certificate of incorporation"),
    taxRegistrationCertificate: joi.string().trim().optional().pattern(cloudinaryPattern).label("Certificate of tax registration"),
    certifications: joi.array().items(joi.string().trim().pattern(cloudinaryPattern)).label("Certifications")
});

module.exports = { updateCompanyIdentityValidator, operationsAndLogisticsValidator, 
updateBusinessIntelligenceValidator, updateBusinessCertifactesValidator };