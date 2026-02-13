const Joi = require("joi");

// Location schema
const locationSchema = Joi.object({
    country: Joi.string().max(100).trim().allow("", null).label("Country"),
    city: Joi.string().max(100).trim().allow("", null).label("City"),
    addressLine: Joi.string().max(1000).trim().allow("", null).label("Address line")
});

// B2B Contact schema
const b2bContactSchema = Joi.object({
    name: Joi.string().max(50).trim().allow("", null).label("B2B Name"),
    title: Joi.string().max(50).trim().allow("", null).label("B2B Title"),
    phone: Joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
        "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
    }).label("Phone"),
    supportEmail: Joi.string().trim().email().lowercase().allow("", null).label("Email")
});

// Create Business Profile schema
const createBusinessProfileSchema = Joi.object({
    companyName: Joi.string().min(5).max(200).required().trim().label("Business name"),
    businessType: Joi.string().max(50).trim().allow("", null).label("Business type"),
    companySize: Joi.string().trim().allow("", null).label("Company size"),
    foundedDate: Joi.date().allow(null).label("Founded date"),
    primaryIndustry: Joi.string().max(500).trim().allow("", null).label("Primary industry"),
    operationHour: Joi.string().max(50).trim().allow("", null).label("Operation hours"),
    location: locationSchema.allow(null).label("Location"),
    certifications: Joi.array().items(Joi.string().trim()).min(1).max(3).default([]).label("Certification"),
    b2bContact: b2bContactSchema.allow(null).label("B2B Contact"),
    website: Joi.string().uri().max(100).trim().allow("", null).label("Website"),
    description: Joi.string().trim().max(5000).allow("", null).label("Business description"),
    
    // Media
    logo: Joi.string().trim().uri().allow("", null).label("Logo"),
    banner: Joi.string().trim().uri().allow("", null).label("Banner")
});

// Update Business Profile schema (all fields optional)
const updateBusinessProfileSchema = Joi.object({
    companyName: Joi.string().min(5).max(200).trim().label("Company name"),
    businessType: Joi.string().max(50).trim().allow("", null).label("Business type"),
    companySize: Joi.string().trim().allow("", null).label("Company size"),
    foundedDate: Joi.date().allow(null),
    primaryIndustry: Joi.string().trim().allow("", null),
    operationHour: Joi.string().trim().allow("", null),
    location: locationSchema.allow(null),
    certifications: Joi.array().items(Joi.string().trim()),
    b2bContact: b2bContactSchema.allow(null),
    
    // Website
    website: Joi.string().uri().trim().max(100).allow("", null).label("Website"),
    
    // Description
    description: Joi.string().trim().max(5000).allow("", null).label("Business description"),
    
    // Media
    logo: Joi.string().trim().uri().allow("", null).label("Logo"),
    banner: Joi.string().trim().uri().allow("", null).label("Banner")
});

// Gallery validation schema
const galleryValidationSchema = Joi.object({
    albumName: Joi.string().trim().min(3).max(50).required().label("Album Name"),
    description: Joi.string().trim().max(1000).allow("", null).label("Album Description"),
    images: Joi.array().items(Joi.string().uri().trim()).min(1).max(8).default([]).label("Album Images")
});

module.exports = { createBusinessProfileSchema, updateBusinessProfileSchema, galleryValidationSchema };
