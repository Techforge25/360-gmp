const Joi = require("joi");

// Location schema
const locationSchema = Joi.object({
    country: Joi.string().trim().allow("", null),
    city: Joi.string().trim().allow("", null),
    addressLine: Joi.string().trim().allow("", null)
});

// B2B Contact schema
const b2bContactSchema = Joi.object({
    name: Joi.string().trim().allow("", null),
    title: Joi.string().trim().allow("", null),
    phone: Joi.string().trim().allow("", null),
    supportEmail: Joi.string().trim().email().lowercase().allow("", null).messages({
        "string.email": "Support email must be a valid email address"
    })
});

// Create Business Profile schema
const createBusinessProfileSchema = Joi.object({
    companyName: Joi.string().min(2).max(200).required().trim().messages({
        "any.required": "Company name is required",
        "string.min": "Company name must be at least 2 characters long",
        "string.max": "Company name must not exceed 200 characters"
    }),
    businessType: Joi.string().trim().allow("", null),
    companySize: Joi.string().trim().allow("", null),
    foundedDate: Joi.date().allow(null),
    primaryIndustry: Joi.string().trim().allow("", null),
    operationHour: Joi.string().trim().allow("", null),
    
    // Location
    location: locationSchema.allow(null),
    
    // Certifications
    certifications: Joi.array().items(Joi.string().trim()).default([]),
    
    // B2B Contact
    b2bContact: b2bContactSchema.allow(null),
    
    // Website
    website: Joi.string().uri().trim().allow("", null).messages({
        "string.uri": "Website must be a valid URL"
    }),
    
    // Description
    description: Joi.string().max(5000).allow("", null),
    
    // Media
    logo: Joi.string().trim().allow("", null),
    banner: Joi.string().trim().allow("", null)
});

// Update Business Profile schema (all fields optional)
const updateBusinessProfileSchema = Joi.object({
    companyName: Joi.string().min(2).max(200).trim().messages({
        "string.min": "Company name must be at least 2 characters long",
        "string.max": "Company name must not exceed 200 characters"
    }),
    businessType: Joi.string().trim().allow("", null),
    companySize: Joi.string().trim().allow("", null),
    foundedDate: Joi.date().allow(null),
    primaryIndustry: Joi.string().trim().allow("", null),
    operationHour: Joi.string().trim().allow("", null),
    
    // Location
    location: locationSchema.allow(null),
    
    // Certifications
    certifications: Joi.array().items(Joi.string().trim()),
    
    // B2B Contact
    b2bContact: b2bContactSchema.allow(null),
    
    // Website
    website: Joi.string().uri().trim().allow("", null).messages({
        "string.uri": "Website must be a valid URL"
    }),
    
    // Description
    description: Joi.string().max(5000).allow("", null),
    
    // Media
    logo: Joi.string().trim().allow("", null),
    banner: Joi.string().trim().allow("", null)
});

module.exports = { createBusinessProfileSchema, updateBusinessProfileSchema };
