const joi = require("joi");
const { allowedIncoterms, allowedTermsAndCapability } = require("../constants");

// Company Identity
const updateBusinessInfoValidator = joi.object({
    tradeName: joi.string().max(200).trim().optional().allow("", null).label("Trade name"),
    companySize: joi.string().trim().required().label("Company size"),
    operationHour: joi.string().max(50).trim().required().label("Operation hours"),
    website: joi.string().uri().max(100).trim().allow("", null).label("Website"),
    description: joi.string().trim().max(5000).required().label("Business description"),
    
    // Warehouse address
    warehouseAddress: joi.object({
        country: joi.string().max(100).trim().optional().allow(null, "").label("Warehouse country"),
        city: joi.string().max(100).trim().optional().allow(null, "").label("Warehouse city"),
        addressLine: joi.string().min(10).max(200).trim().optional().allow(null, "").label("Warehouse address line"),
    }).optional().label("Warehouse Address"),   
    
    // Additional warehouse address
    additionalWarehouseAddress: joi.array().items(joi.object({
        country: joi.string().trim().max(100).allow("", null).label("Additional warehouse country"),
        city: joi.string().trim().max(100).allow("", null).label("Additional warehouse city"),
        addressLine: joi.string().trim().min(10).max(200).allow("", null).label("Additional warehouse address line"),        
    })).optional().label("Additional Warehouse Address"),    

    // International Commercial Terms
    incoterms: joi.string().max(500).trim().optional().allow("", null).label("International Commercial Terms"),
    termsAndCapability: joi.string().max(500).optional().allow("", null).label("Terms and capability"), 
    
    /* INTERNATIONAL OFFICES */
    internationalOffices: joi.array().max(5).items(joi.object({
        officeName: joi.string().trim().min(2).max(50).optional().allow("", null).label("Office name"),
        country: joi.string().trim().max(100).optional().allow("", null).label("Country"),
        city: joi.string().trim().max(100).optional().allow("", null).label("City"),
        state: joi.string().trim().max(100).optional().allow("", null).label("State"),
        addressLine: joi.string().trim().min(10).max(200).optional().allow("", null).label("Address line"), 
        zipCode: joi.string().trim().min(5).max(50).optional().allow("", null).label("Zip code"), 
    })).optional().label("International Offices"),
    
    /* BUSINESS INTELLIGENCE & LEADERSHIP */
    primaryContactPerson: joi.object({
        name: joi.string().trim().min(2).max(50).required().label("Name"),
        title: joi.string().trim().min(2).max(50).required().label("Title"),
        phone: joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
            "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
        }).required().label("Phone"),
        supportEmail: joi.string().trim().email().lowercase().required().label("Support Email").messages({
            "string.empty": "Support Email is required",
            "string.email": "Please enter a valid Support Email address",
            "any.required": "Support Email is required",
        }),
    }).required().label("Primary Contact Person"),
    
    /* OPERATIONAL & TRADE PROFILE */
    operationalAndTradeProfile: joi.object({
        auditingAgency: joi.string().trim().allow("").optional().label("Auditing agency"),
        regionOfOperations: joi.array().min(1).items(joi.string().trim()).label("Region of operations"),  
        tradeAffiliations: joi.array().max(5).items(joi.string().optional().allow(null, "")).label("Trade Affiliations"),
    }).optional().label("Operational and trade profile")    
});

module.exports = { updateBusinessInfoValidator };