const Joi = require("joi");

// Location schema for job
const jobLocationSchema = Joi.object({
    country: Joi.string().trim().allow("", null),
    city: Joi.string().trim().allow("", null)
});

// Create Job schema
const createJobSchema = Joi.object({
    businessId: Joi.string().required().messages({
        "any.required": "Business ID is required",
        "string.empty": "Business ID cannot be empty"
    }),
    jobTitle: Joi.string().trim().required().messages({
        "any.required": "Job title is required"
    }),
    jobCategory: Joi.string().trim().allow("", null),
    employmentType: Joi.string().trim().allow("", null),
    experienceLevel: Joi.string().trim().allow("", null),
    description: Joi.string().max(5000).allow("", null),
    salaryMin: Joi.number().min(0).allow(null),
    salaryMax: Joi.number().min(0).allow(null).greater(Joi.ref("salaryMin")).messages({
        "number.greater": "Maximum salary must be greater than minimum salary"
    }),
    location: jobLocationSchema.allow(null),
    status: Joi.string().trim().allow("", null)
});

// Update Job schema (all fields optional)
const updateJobSchema = Joi.object({
    businessId: Joi.string().allow("", null),
    jobTitle: Joi.string().trim().allow("", null),
    jobCategory: Joi.string().trim().allow("", null),
    employmentType: Joi.string().trim().allow("", null),
    experienceLevel: Joi.string().trim().allow("", null),
    description: Joi.string().max(5000).allow("", null),
    salaryMin: Joi.number().min(0).allow(null),
    salaryMax: Joi.number().min(0).allow(null).greater(Joi.ref("salaryMin")).messages({
        "number.greater": "Maximum salary must be greater than minimum salary"
    }),
    location: jobLocationSchema.allow(null),
    status: Joi.string().trim().allow("", null)
});

module.exports = { createJobSchema, updateJobSchema };
