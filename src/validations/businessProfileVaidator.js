const joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9 -]*$/;
// const addressPattern = /^[a-zA-Z0-9 -,]*$/;
// const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;
// const ownerNamePattern = /^[a-zA-Z\s\-.']*$/;
// const operatingHourPattern = /^(0?[1-9]|1[0-2])(AM|PM|am|pm)\s-\s(0[1-9]|1[0-2])(AM|PM|am|pm)$/;
// const contactNamePattern = /^[A-Za-z\s\-.']*$/;
// const tradeAffiliationPattern = /^[A-Za-z0-9 -]*$/;
// const auditingAgencyPattern = /^[A-Za-z0-9\s,\-&]*$/;
// const cityPattern = /^(?=.*[A-Za-zÀ-ÖØ-öø-ÿ])[A-Za-z0-9À-ÖØ-öø-ÿ\s\-'.]+$/;
// const primaryIndustryPattern = /^[A-Za-z0-9\- &/]*$/;

// Critical
// const identificationPattern = /^[A-Za-z0-9Ññ\- .\/&]+$/;

// Create Business Profile schema
const createBusinessProfileSchema = joi.object({
    /* BASIC IDENTITY & LEGAL */ 
    ownerName: joi.string().min(3).max(50).trim().required().label("Owner name"),
    companyName: joi.string().min(3).max(50).trim().required().label("Company name"),
    tradeName: joi.string().max(200).trim().optional().allow("", null).label("Trade name"),
    businessRegistrationNumber: joi.string().max(50).trim().optional().allow("", null).label("Business Registration Number"),
    taxIdentificationNumber: joi.string().min(5).max(20).trim().required().label("Tax identification number"),
    dunsNumber: joi.string().max(100).trim().allow("", null).label("Data Universal Numbering System"),
    countryOfRegistration: joi.string().max(50).trim().allow("", null).label("Country of registration"),
    businessType: joi.string().max(50).trim().allow("", null).label("Business type"),
    primaryIndustry: joi.string().max(500).trim().allow("", null).label("Primary industry"),
    foundedDate: joi.date().max("now").allow(null).label("Founded date"),
    companySize: joi.string().trim().allow("", null).label("Company size"),
    operationHour: joi.string().max(50).trim().allow("", null).label("Operation hours"),
    website: joi.string().uri().max(100).trim().allow("", null).label("Website"),
    description: joi.string().trim().max(5000).allow("", null).label("Business description"),
    logo: joi.string().trim().uri().allow("", null).label("Logo"),
    banner: joi.string().trim().uri().allow("", null).label("Banner"),

    /* BUSINESS OPERATION */
    // Head office address
    headOffice: joi.object({
        country: joi.string().max(100).trim().allow("", null).label("Head office country"),
        city: joi.string().max(100).trim().allow("", null).label("Head office city"),
        addressLine: joi.string().min(10).max(500).trim().allow("", null).label("Head office address line"),
    }).label("Head Office"),

    // Warehouse address
    warehouseAddress: joi.object({
        country: joi.string().max(100).trim().allow("", null).label("Warehouse country"),
        city: joi.string().max(100).trim().allow("", null).label("Warehouse city"),
        addressLine: joi.string().min(10).max(500).trim().allow("", null).label("Warehouse address line"),
    }).label("Warehouse Address"),

    // Additional warehouse address
    additionalWarehouseAddress: joi.array().max(5).items(joi.object({
        country: joi.string().trim().max(100).allow("", null).label("Additional warehouse country"),
        city: joi.string().trim().max(100).allow("", null).label("Additional warehouse city"),
        addressLine: joi.string().trim().min(10).max(500).allow("", null).label("Additional warehouse address line"),        
    })).label("Additional Warehouse Address"),

    // International Commercial Terms
    incoterms: joi.string().max(500).trim().allow("", null).label("International Commercial Terms"),
    termsAndCapability: joi.string().max(500).trim().allow("", null).label("International Commercial Terms"),

    /* INTERNATIONAL OFFICES */
    internationalOffices: joi.array().max(5).items(joi.object({
        officeName: joi.string().trim().min(2).max(5).optional().allow("", null).label("Office name"),
        country: joi.string().trim().max(100).allow("", null).label("Country"),
        city: joi.string().trim().max(100).allow("", null).label("City"),
        state: joi.string().trim().max(100).allow("", null).label("State"),
        addressLine: joi.string().trim().min(10).max(500).allow("", null).label("Address line"), 
        zipCode: joi.string().trim().min(10).max(500).allow("", null).label("Zip code"), 
    })).label("International Offices"),

    /* BUSINESS INTELLIGENCE & LEADERSHIP */
    primaryContactPerson: joi.object({
        name: joi.string().trim().min(2).max(50).optional().allow("", null).label("Name"),
        title: joi.string().trim().min(2).max(50).optional().allow("", null).label("Title"),
        phone: joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
            "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
        }).label("Phone"),
        supportEmail: joi.string().trim().email().lowercase().required().label("Support Email")
    }).label("Primary Contact Person"),

    /* EXECUTIVE LEADERSHIP & STAKEHOLDER */
    executiveAndLeadership: joi.array().min(1).items(joi.object({
        name: joi.string().trim().min(2).max(100).label("Stake holder name"),
        ownershipPercentage: joi.number().min(1).max(100).precision(2).label("Stake holder percentage"),
        role: joi.string().trim().min(2).max(100).label("Stake holder role"),

        // If ownership percentage is less than 25%
        votingRights: joi.array().items(joi.string())
        .when("ownershipPercentage", { is: joi.number().less(25), then: joi.array().min(1), otherwise: joi.forbidden() }).label("Voting rights"),

        // If ownership percentage is equal or greater than 25% (Apply KYC)
        kyc: joi.object({
            dob: joi.date().required().label("Stake holder DOB"),
            nationality: joi.string().trim().required().label("Stake holder nationality"),
            phone: joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
                "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
            }).label("Stake holder phone"),
            residentialAddress: joi.string().trim().required().label("Stake holder residential address"),
            governmentIdType: joi.string().trim().required().label("Stake holder Government ID Type"),
            idNumber: joi.string().trim().required().label("Stake holder ID Number"),

            // Media files (Documents)
            idFront: joi.string().trim().uri().required().label("Front ID picture"),
            idBack: joi.string().trim().uri().required().label("Back ID picture"),
            proofOfResidentialAddress: joi.string().trim().uri().required().label("Proof of residential address document"),
            proofOfOwnership: joi.string().trim().uri().required().label("Proof of ownership document"),
        })
        .when("ownershipPercentage", { is: joi.number().min(25), then: joi.required(), otherwise: joi.forbidden() }).label("KYC")        
    })).custom((value, helpers) => {
        const totalOwnership = value.reduce((sum, stakeholder) => {
            return sum + (stakeholder.ownershipPercentage || 0);
        }, 0);

        if(Number(totalOwnership.toFixed(2)) !== 100)
        {
            return helpers.message("Total ownership percentage of all stakeholders must equal 100%");
        }

        return value;
    }).required().label("Executive leadership & stakeholder"),    
    
    // Parent company
    ownedByAnotherCompany: joi.boolean().default(false).label("Is owned by another company"),
    parentCompany: joi.object({
        companyName: joi.string().trim().min(2).max(100).required().label("Parent company name"),
        ownershipPercentage: joi.number().min(1).max(100).precision(2).required().label("Parent company percentage"),
        countryOfIncorporation: joi.string().trim().optional().allow("", null).label("Country of incorporation")
    }).when("ownedByAnotherCompany", { is: true, then: joi.required(), otherwise:joi.forbidden() }).label("Parent company details"),

    /* OPERATIONAL & TRADE PROFILE */
    operationalAndTradeProfile: joi.object({
        auditingAgency: joi.string().trim().optional().label("Auditing agency"),
        regionOfOperations: joi.array().min(1).items(joi.string().trim()).label("Region of operations"),  
        tradeAffiliations: joi.array().min(1).max(5).items(joi.string()).label("Trade Affiliations"),
    }).required().label("Operational and trade profile"),

    /* AML & TRANSACTION PROFILE */
    amlAndTransactionProfile: joi.object({
        purpose: joi.string().trim().min(10).max(5000).required().label("Purpose"),
        revenueRange: joi.string().trim().required().label("Revenue range"),
        mainCounterParties: joi.array().min(1).items(joi.string().trim()).label("Main counter parties"),
        tradeCorridors: joi.array().min(1).items(joi.string().trim()).label("Trade corridors"),
        pep: joi.boolean().default(false).label("Is politically expose person")
    }).required().label("AML & transaction profile"),

    /* REQUIRED DOCUMENTS (MEDIA FILES) */
    certificateOfIncorporation: joi.string().trim().uri().required().label("Certificate of incorporation"),
    taxRegistrationCertificate: joi.string().trim().uri().required().label("Certificate of tax registration"),
    shareHolderRegister: joi.string().trim().uri().required().label("Share holder register"),
    operatingLicense: joi.string().trim().uri().required().label("Operating license"),
});

// Gallery validation schema
const galleryValidationSchema = joi.object({
    albumName: joi.string().trim().min(3).max(50).required().pattern(alphaNumericPattern).label("Album Name"),
    description: joi.string().trim().max(1000).allow("", null).label("Album Description"),
    images: joi.array().items(joi.string().uri().trim()).min(1).max(8).default([]).label("Album Images")
});

// Update gallery validation schema
const updateGalleryValidationSchema = joi.object({
    albumName: joi.string().trim().min(3).max(50).required().pattern(alphaNumericPattern).label("Album Name"),
    description: joi.string().trim().max(1000).allow("", null).label("Album Description")
});

module.exports = { createBusinessProfileSchema, galleryValidationSchema, updateGalleryValidationSchema };