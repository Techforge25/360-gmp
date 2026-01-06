const Joi = require("joi");

const educationSchema = Joi.object({
    institution: Joi.string().required().messages({
        "any.required": "Institution is required"
    }),
    degree: Joi.string().required().messages({
        "any.required": "Degree is required"
    }),
    fieldOfStudy: Joi.string().required().messages({
        "any.required": "Field of study is required"
    }),
    startDate: Joi.date().required().messages({
        "any.required": "Start date is required"
    }),
    endDate: Joi.date().allow(null),
    isCurrent: Joi.boolean().default(false),
    description: Joi.string().allow("", null),
    grade: Joi.string().allow("", null)
});

const createUserProfileSchema = Joi.object({
    fullName: Joi.string().min(3).max(100).required().messages({
        "any.required": "Full name is required"
    }),
    title: Joi.string().allow("", null),
    phone: Joi.string().allow("", null),
    location: Joi.string().allow("", null),
    bio: Joi.string().max(1000).allow("", null),
    resumeUrl: Joi.string().allow("", null),
    imageProfile: Joi.string().allow("", null),

    skills: Joi.array().items(Joi.string()).default([]),
    employmentType:Joi.array().allow("", null),

    // Job preferences
    targetJob: Joi.string().allow("", null),
    minSalary: Joi.number().min(0),
    maxSalary: Joi.number().greater(Joi.ref("minSalary")),
    education: Joi.array().items(educationSchema).default([])
});

module.exports = { createUserProfileSchema };