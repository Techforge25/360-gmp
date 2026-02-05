const joi = require("joi");

const educationSchema = joi.object({
    institution: joi.string().required().messages({
        "any.required": "Institution is required"
    }),
    degree: joi.string().required().messages({
        "any.required": "Degree is required"
    }),
    fieldOfStudy: joi.string().required().messages({
        "any.required": "Field of study is required"
    }),
    startDate: joi.date().required().messages({
        "any.required": "Start date is required"
    }),
    endDate: joi.date().allow(null),
    isCurrent: joi.boolean().default(false),
    description: joi.string().allow("", null),
    grade: joi.string().allow("", null)
});

// Create user profile validation schema
const createUserProfileSchema = joi.object({
    fullName: joi.string().min(3).max(100).required().messages({
        "any.required": "Full name is required"
    }),
    title: joi.string().allow("", null),
    phone: joi.string().allow("", null),
    email: joi.string().trim().lowercase().email().required().label("Email"),
    location: joi.string().allow("", null),
    bio: joi.string().max(1000).allow("", null),
    resumeUrl: joi.string().allow("", null),
    logo: joi.string().allow("", null),

    skills: joi.array().items(joi.string()).default([]),
    employmentType:joi.array().allow("", null),

    // Job preferences
    targetJob: joi.string().allow("", null),
    minSalary: joi.number().min(0),
    maxSalary: joi.number().greater(joi.ref("minSalary")),
    education: educationSchema.default({})
});

// Update contact info 
const updateUserContactInfoValidationSchema = joi.object({
    // Basic info
    email: joi.string().trim().required().lowercase().label("Email"),
    phone: joi.string().trim().required().label("Phone"),
    location: joi.string().optional().label("Location")
});

// Update education
const updateEducationValidationSchema = joi.object({
    institution: joi.string().trim().required().label("Intitution name"),
    degree: joi.string().trim().required().label("Educational degree"),
    fieldOfStudy: joi.string().trim().required().label("Field of study"),
    startDate: joi.date().required().label("Starting date"),
    endDate: joi.date().optional().label("Ending date"),
    isCurrent: joi.boolean().default(false).label("Currently enrolled"),
    description: joi.string().optional().label("Educational description"),
    grade: joi.string().optional().label("Grade")
});

// Allowed employment types
const allowedEmploymentTypes = ["Full-Time", "Remote", "Contract", "Hybrid", "Part-Time"];

// Add work experience validation schema
const addWorkExperienceValidationSchema = joi.object({
    jobTitle: joi.string().trim().required().label("Job title"),
    employmentType: joi.array().items(joi.string().trim().valid(...allowedEmploymentTypes)).min(1).max(5).label("Employment type"),
    companyName: joi.string().trim().required().label("Company name"),
    startDate: joi.date().required().label("Starting date"),
    endDate: joi.date().optional().label("Ending date"),
    location: joi.string().trim().required().label("Location"),
    description: joi.string().optional().label("Description"),
    isCurrentlyWorking: joi.boolean().default(false).label("Currently enrolled")
});

// Update job preferences validation schema
const updateJobPreferencesValidationSchema = joi.object({
    targetJob: joi.string().allow("", null).label("Target job"),
    employmentType: joi.array().items(joi.string().trim().valid(...allowedEmploymentTypes)).min(1).max(5).label("Employment type"),
});

// Add user social link validation schema
const userSocialLinkValidationSchema = joi.object({
    platformName: joi.string().trim().required().label("Platform name"),
    url: joi.string().trim().uri().required().label("Platform url"),
});

module.exports = { createUserProfileSchema, updateUserContactInfoValidationSchema, updateEducationValidationSchema, 
addWorkExperienceValidationSchema, updateJobPreferencesValidationSchema, userSocialLinkValidationSchema };