const Joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9 -]*$/;
const addressPattern = /^[a-zA-Z0-9 -,]*$/;
const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;

// Create Community schema
const createCommunitySchema = Joi.object({
    name: Joi.string().pattern(alphaNumericPattern).min(3).max(100).required().trim().messages({
        "any.required": "Community name is required",
        "string.min": "Community name must be at least 3 characters long",
        "string.max": "Community name must not exceed 100 characters",
        "string.pattern.base": "Community name can only contain letters, numbers, spaces, and hyphens"
    }).label("Community name"),
    category: Joi.string().pattern(alphaNumericPattern).trim().allow("", null).label("Category"),
    type: Joi.string().valid("public", "private", "featured").default("public").messages({
        "any.only": "Community type must be one of: public, private, featured"
    }).label("Type"),
    description: Joi.string().max(1000).trim().allow("", null).label("Description"),
    purpose: Joi.string().max(2000).trim().allow("", null).label("Purpose"),
    tags: Joi.array().items(Joi.string().pattern(alphaNumericPattern).trim()).default([]).label("Tags"),
    rules: Joi.string().max(2000).trim().allow("", null).label("Rules"),
    coverImage: Joi.string().trim().optional().uri().label("Cover image"),
    profileImage: Joi.string().trim().optional().uri().label("Community image"),
    industry: Joi.string().pattern(alphaNumericPattern).allow("", null).label("Industry"),
    region: Joi.string().pattern(addressPattern).allow("", null).label("Region"),
});

// Update Community schema (all fields optional)
const updateCommunitySchema = Joi.object({
    name: Joi.string().pattern(alphaNumericPattern).min(3).max(100).trim().messages({
        "string.min": "Community name must be at least 3 characters long",
        "string.max": "Community name must not exceed 100 characters",
        "string.pattern.base": "Community name can only contain letters, numbers, spaces, and hyphens"
    }).label("Community name"),
    category: Joi.string().pattern(alphaNumericPattern).trim().allow("", null).label("Category"),
    type: Joi.string().valid("public", "private", "featured").messages({
        "any.only": "Community type must be one of: public, private, featured"
    }).label("Type"),
    description: Joi.string().max(1000).trim().allow("", null).label("Description"),
    purpose: Joi.string().max(2000).trim().allow("", null).label("Purpose"),
    tags: Joi.array().items(Joi.string().pattern(alphaNumericPattern).trim()).label("Tags"),
    rules: Joi.string().max(2000).trim().allow("", null).label("Rules"),
    coverImage: Joi.string().trim().optional().uri().label("Cover image"),
    profileImage: Joi.string().trim().optional().uri().label("Community image"),
    status: Joi.string().valid("active", "inactive", "suspended").messages({
        "any.only": "Status must be one of: active, inactive, suspended"
    }).label("Status")
});

// Join Community schema
const joinCommunitySchema = Joi.object({
    communityId: Joi.string().required().messages({
        "any.required": "Community ID is required"
    })
});

// Approve/Reject Membership schema
const approveMembershipSchema = Joi.object({
    userProfileId: Joi.string().required().messages({
        "any.required": "User Profile ID is required"
    }),
    status: Joi.string().valid("approved", "rejected").required().messages({
        "any.required": "Status is required",
        "any.only": "Status must be either 'approved' or 'rejected'"
    })
});

module.exports = {
    createCommunitySchema,
    updateCommunitySchema,
    joinCommunitySchema,
    approveMembershipSchema
};