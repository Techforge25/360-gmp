const joi = require("joi");

const updateUserProfileValidationSchema = joi.object({
    // Basic info
    fullName: joi.string().trim().required().label("Full name"),
    imageProfile: joi.string().trim().required().label("Image profile"),
    bio: joi.string().optional().label("Bio"),
    email: joi.string().trim().required().lowercase().label("Email"),
    phone: joi.string().trim().required().label("Phone"),
    location: joi.string().optional().label("Location"),
    resumeUrl: joi.string().trim().required().label("Resume"),

    // Education
    education: joi.object({
        institution: joi.string().trim().required().label("Intitution name"),
        degree: joi.string().trim().required().label("Educational degree"),
        fieldOfStudy: joi.string().trim().required().label("Field of study"),
        startDate: joi.date().required().label("Starting date"),
        endDate: joi.date().optional().label("Ending date"),
        isCurrent: joi.boolean().required().label("Current enrolled"),
        description: joi.string().optional().label("Educational description"),
        grade: joi.string().optional().label("Grade")
    }),

    // Job info
    title: joi.string().trim().required().label("Job title"),
    employementType: joi.array().items(joi.string()).min(1).label("Employment type"),
});

module.exports = updateUserProfileValidationSchema;