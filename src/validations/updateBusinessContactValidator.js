const joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9 -]*$/;

const updateBusinessContactValidator = joi.object({
    // Primary contact person
    primaryContactPerson: joi.object({
        phone: joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
            "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
        }).label("Phone"),
        supportEmail: joi.string().trim().email().lowercase().allow("", null).label("Email")        
    }),
    website: joi.string().trim().uri().allow("", null).label("Website"),

    // Head office
    headOffice: joi.object({
        country: joi.string().max(100).trim().required().pattern(alphaNumericPattern).label("Country"),
        city: joi.string().max(100).trim().required().pattern(alphaNumericPattern).label("City"),
        addressLine: joi.string().max(1000).trim().required().label("Address line")   
    })
});

module.exports = { updateBusinessContactValidator };