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
    }),
    category: Joi.string().pattern(alphaNumericPattern).trim().allow("", null),
    type: Joi.string().valid("public", "private", "featured").default("public").messages({
        "any.only": "Community type must be one of: public, private, featured"
    }),
    description: Joi.string().max(1000).trim().allow("", null),
    purpose: Joi.string().pattern(customPattern).max(500).trim().allow("", null),
    tags: Joi.array().items(Joi.string().pattern(alphaNumericPattern).trim()).default([]),
    rules: Joi.string().pattern(customPattern).max(2000).trim().allow("", null),
    coverImage: Joi.string().trim().allow("", null),
    profileImage: Joi.string().trim().allow("", null),
    industry: Joi.string().pattern(alphaNumericPattern).allow("", null).label("Industry"),
    region: Joi.string().pattern(addressPattern).allow("", null).label("Region"),
});

// Update Community schema (all fields optional)
const updateCommunitySchema = Joi.object({
    name: Joi.string().pattern(alphaNumericPattern).min(3).max(100).trim().messages({
        "string.min": "Community name must be at least 3 characters long",
        "string.max": "Community name must not exceed 100 characters",
        "string.pattern.base": "Community name can only contain letters, numbers, spaces, and hyphens"
    }),
    category: Joi.string().pattern(alphaNumericPattern).trim().allow("", null),
    type: Joi.string().valid("public", "private", "featured").messages({
        "any.only": "Community type must be one of: public, private, featured"
    }),
    description: Joi.string().pattern(customPattern).max(1000).trim().allow("", null),
    purpose: Joi.string().pattern(customPattern).max(500).trim().allow("", null),
    tags: Joi.array().items(Joi.string().pattern(alphaNumericPattern).trim()),
    rules: Joi.string().pattern(customPattern).max(2000).trim().allow("", null),
    coverImage: Joi.string().trim().uri().allow("", null),
    profileImage: Joi.string().trim().uri().allow("", null),
    status: Joi.string().valid("active", "inactive", "suspended").messages({
        "any.only": "Status must be one of: active, inactive, suspended"
    })
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