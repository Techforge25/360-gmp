const Joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9 -]*$/;
const addressPattern = /^[a-zA-Z0-9 -,]*$/;
const customPattern = /^[a-zA-Z0-9 \-.,\n\r]*$/;

// Allowed community categories
const allowedCommunityCategories = ["Manufacturer", "Distributor", "Wholesaler", "Retailer", 
"Service Provider", "Consultant", "Franchise", "Others"];

// Create Community schema
const createCommunitySchema = Joi.object({
    name: Joi.string().pattern(alphaNumericPattern).min(3).max(100).trim().required().label("Community name"),
    category: Joi.string().trim().valid(...allowedCommunityCategories).label("Category"),
    type: Joi.string().valid("public", "private").default("public").label("Type"),
    description: Joi.string().max(200).trim().allow("", null).label("Description"),
    purpose: Joi.string().max(1000).trim().allow("", null).label("Purpose"),
    rules: Joi.string().max(2000).trim().allow("", null).label("Rules"),
    coverImage: Joi.string().trim().optional().uri().label("Cover image"),
    profileImage: Joi.string().trim().optional().uri().label("Community image")
});

// Update community validator
const updateCommunitySchema = Joi.object({
    name: Joi.string().pattern(alphaNumericPattern).min(3).max(100).trim().required().label("Community name"),
    category: Joi.string().trim().valid(...allowedCommunityCategories).label("Category"),
    description: Joi.string().max(200).trim().allow("", null).label("Description"),
    purpose: Joi.string().max(1000).trim().allow("", null).label("Purpose"),
    rules: Joi.string().max(2000).trim().allow("", null).label("Rules"),
    coverImage: Joi.string().trim().optional().uri().label("Cover image"),
    profileImage: Joi.string().trim().optional().uri().label("Community image")
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