const Joi = require("joi");

const createJobApplicationSchema = Joi.object({
    resumeUrl: Joi.string().required(),
    portfolioLink: Joi.string().optional(),
    yearsOfExperience: Joi.number().min(0).optional(),
    immediateJoiningStatus: Joi.string().valid("Yes", "No").optional(),
    expectedSalary: Joi.string().optional()
});

module.exports = { createJobApplicationSchema };