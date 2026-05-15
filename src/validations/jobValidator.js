const Joi = require("joi");

// Patterns
const alphaNumericPattern = /^[a-zA-Z0-9 -]*$/;
const locationPattern = /^[a-zA-Z0-9 -,]*$/;
const jobTitlePattern = /^[a-zA-Z0-9 \-()/]*$/;

// Location schema for job
const jobLocationSchema = Joi.object({
    country: Joi.string().pattern(locationPattern).trim().allow("", null),
    city: Joi.string().pattern(locationPattern).trim().allow("", null)
});

// Create Job schema
const createJobSchema = Joi.object({
    businessId: Joi.string().required().messages({
        "any.required": "Business ID is required",
        "string.empty": "Business ID cannot be empty"
    }),
    jobTitle: Joi.string().pattern(jobTitlePattern).trim().required().messages({
        "any.required": "Job title is required",
        "string.pattern.base": "Job title can only contain letters, numbers, spaces, hyphens, and parentheses"
    }),
    jobCategory: Joi.string().pattern(alphaNumericPattern).trim().allow("", null),
    employmentType: Joi.string().pattern(alphaNumericPattern).trim().allow("", null),
    experienceLevel: Joi.string().pattern(alphaNumericPattern).trim().allow("", null),
    description: Joi.string().max(5000).allow("", null),
    salaryMin: Joi.number().min(0).allow(null),
    salaryMax: Joi.number().min(0).allow(null).greater(Joi.ref("salaryMin")).messages({
        "number.greater": "Maximum salary must be greater than minimum salary"
    }),
    location: jobLocationSchema.allow({}, null),
    status: Joi.string().pattern(alphaNumericPattern).trim().allow("", null)
});

// Update Job schema (all fields optional)
const updateJobSchema = Joi.object({
    jobTitle: Joi.string().pattern(jobTitlePattern).trim().allow("", null).messages({
        "string.pattern.base": "Job title can only contain letters, numbers, spaces, hyphens, and parentheses"
    }),
    jobCategory: Joi.string().pattern(alphaNumericPattern).trim().allow("", null),
    employmentType: Joi.string().pattern(alphaNumericPattern).trim().allow("", null),
    experienceLevel: Joi.string().pattern(alphaNumericPattern).trim().allow("", null),
    description: Joi.string().max(5000).allow("", null),
    salaryMin: Joi.number().min(0).allow(null),
    salaryMax: Joi.number().min(0).allow(null).greater(Joi.ref("salaryMin")).messages({
        "number.greater": "Maximum salary must be greater than minimum salary"
    }),
    location: jobLocationSchema.allow({}, null)
});

module.exports = { createJobSchema, updateJobSchema };