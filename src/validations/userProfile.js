const joi = require("joi");

const educationSchema = joi.object({
    institution: joi.string().trim().min(1).max(50).required().label("Institution"),
    degree: joi.string().trim().min(1).max(50).required().label("Degree"),
    fieldOfStudy: joi.string().trim().min(1).max(50).required().label("Field of Study"),
    startDate: joi.date().required().label("Start date"),

    endDate: joi.date().min(joi.ref("startDate")).when("isCurrent", { 
        is: false, then: joi.required(), otherwise: joi.valid(null).optional() 
    }).label("Ending date"),
    
    isCurrent: joi.boolean().default(false),
    description: joi.string().max(1000).allow("", null).label("Description"),
    grade: joi.string().max(20).allow("", null)
});

// Create user profile validation schema
const createUserProfileSchema = joi.object({
    fullName: joi.string().min(3).max(40).required().label("Full name"),
    title: joi.string().max(40).allow("", null).label("Title"),
    phone: joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
        "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
    }).label("Phone"),
    email: joi.string().trim().lowercase().email().max(40).required().label("Email"),
    location: joi.string().trim().max(100).allow("", null).label("Location"),
    bio: joi.string().trim().max(1000).allow("", null).label("Bio"),
    resumeUrl: joi.string().uri().allow("", null).label("Resume"),
    logo: joi.string().uri().required().label("Profile image"),
    banner: joi.string().uri().optional().label("Banner"),

    skills: joi.array().items(joi.string()).default([]).label("Skills"),
    employmentType:joi.array().allow("", null).label("Employment type"),

    // Job preferences
    targetJob: joi.string().max(50).allow("", null).label("Target job"),
    minSalary: joi.number().min(0).label("Minimum salary"),
    maxSalary: joi.number().greater(joi.ref("minSalary")).label("Maximum salary"),
    education: educationSchema.default({}).label("Education")
});

// Update contact info 
const updateUserContactInfoValidationSchema = joi.object({
    // Basic info
    email: joi.string().trim().lowercase().email().max(40).required().label("Email"),
    phone: joi.string().trim().max(15).pattern(/^\+?[1-9]\d{9,14}$/).required().messages({
        "string.pattern.base": "Phone number must be a valid international format (e.g., +923001234567)."
    }).label("Phone"),
    location: joi.string().trim().max(100).allow("", null).label("Location"),
});

// Update education
const updateEducationValidationSchema = joi.object({
    institution: joi.string().trim().required().label("Intitution name"),
    degree: joi.string().trim().required().label("Educational degree"),
    fieldOfStudy: joi.string().trim().required().label("Field of study"),
    startDate: joi.date().required().label("Starting date"),

    endDate: joi.date().min(joi.ref("startDate")).when("isCurrent", { 
        is: false, then: joi.required(), otherwise: joi.valid(null).optional() 
    }).label("Ending date"),

    isCurrent: joi.boolean().default(false).label("Currently enrolled"),
    description: joi.string().optional().label("Educational description"),
    grade: joi.string().optional().label("Grade")
});

// Allowed employment types
const allowedEmploymentTypes = ["Full-Time", "Remote", "Contract", "Hybrid", "Part-Time"];

// Add work experience validation schema
const addWorkExperienceValidationSchema = joi.object({
    jobTitle: joi.string().trim().max(50).required().label("Job title"),
    employmentType: joi.array().items(joi.string().trim().valid(...allowedEmploymentTypes)).min(1).max(5).label("Employment type"),
    companyName: joi.string().trim().max(50).required().label("Company name"),
    startDate: joi.date().required().label("Starting date"),

    endDate: joi.when("isCurrentlyWorking", { 
        is: false, then: joi.date().min(joi.ref("startDate")).required(),
        otherwise: joi.valid(null, "", undefined).optional()
    }).label("Ending date"),

    location: joi.string().trim().max(100).required().label("Location"),
    description: joi.string().max(1000).optional().label("Description"),
    isCurrentlyWorking: joi.boolean().default(false).label("Currently enrolled")
});

// Update job preferences validation schema
const updateJobPreferencesValidationSchema = joi.object({
    targetJob: joi.string().max(50).allow("", null).label("Target job"),
    employmentType: joi.array().items(joi.string().trim().valid(...allowedEmploymentTypes)).min(1).max(5).label("Employment type"),
});

// Add user social link validation schema
const userSocialLinkValidationSchema = joi.object({
    platformName: joi.string().trim().max(50).required().label("Platform name"),
    url: joi.string().trim().max(500).uri().required().label("Platform url"),
});

module.exports = { createUserProfileSchema, updateUserContactInfoValidationSchema, updateEducationValidationSchema, 
addWorkExperienceValidationSchema, updateJobPreferencesValidationSchema, userSocialLinkValidationSchema };