const Joi = require("joi");

// Create Community schema
const createCommunitySchema = Joi.object({
    businessId: Joi.string().required().messages({
        "any.required": "Business ID is required",
        "string.empty": "Business ID cannot be empty"
    }),
    name: Joi.string().min(3).max(100).required().trim().messages({
        "any.required": "Community name is required",
        "string.min": "Community name must be at least 3 characters long",
        "string.max": "Community name must not exceed 100 characters"
    }),
    category: Joi.string().trim().allow("", null),
    type: Joi.string().valid("public", "private", "featured").default("public").messages({
        "any.only": "Community type must be one of: public, private, featured"
    }),
    description: Joi.string().max(1000).trim().allow("", null),
    purpose: Joi.string().max(500).trim().allow("", null),
    tags: Joi.array().items(Joi.string().trim()).default([]),
    rules: Joi.string().max(2000).trim().allow("", null),
    coverImage: Joi.string().trim().allow("", null),
    profileImage: Joi.string().trim().allow("", null)
});

// Update Community schema (all fields optional)
const updateCommunitySchema = Joi.object({
    name: Joi.string().min(3).max(100).trim().messages({
        "string.min": "Community name must be at least 3 characters long",
        "string.max": "Community name must not exceed 100 characters"
    }),
    category: Joi.string().trim().allow("", null),
    type: Joi.string().valid("public", "private", "featured").messages({
        "any.only": "Community type must be one of: public, private, featured"
    }),
    description: Joi.string().max(1000).trim().allow("", null),
    purpose: Joi.string().max(500).trim().allow("", null),
    tags: Joi.array().items(Joi.string().trim()),
    rules: Joi.string().max(2000).trim().allow("", null),
    coverImage: Joi.string().trim().allow("", null),
    profileImage: Joi.string().trim().allow("", null),
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
