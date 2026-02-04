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
    education: joi.array().items(educationSchema).default([])
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

module.exports = { createUserProfileSchema, updateUserContactInfoValidationSchema, updateEducationValidationSchema };