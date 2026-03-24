const Joi = require("joi");

const createJobApplicationSchema = Joi.object({
    resumeUrl: Joi.string().trim().uri().required().label("Resume"),
    portfolioLink: Joi.string().trim().optional().allow(null, "").uri().label("Portfolio link"),
    yearsOfExperience: Joi.number().min(0).optional().label("Years of experience"),
    immediateJoiningStatus: Joi.string().valid("Yes", "No").optional().label("Immediate joining status"),
    expectedSalary: Joi.number().integer().positive().optional().label("Expected salary")
});

module.exports = { createJobApplicationSchema };