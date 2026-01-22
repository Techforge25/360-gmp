const joi = require("joi");

// Report job validation schema
const reportJobValidationSchema = joi.object({
    jobId: joi.string().trim().required().label("Job ID"),
    subject: joi.string().trim().required().label("Subject"),
    category: joi.string().trim().required().label("Category"),
    description: joi.string().trim().optional().label("Category"),
    evidences: joi.array().items(joi.string().trim()).min(1).label("Evidence images")
});

module.exports = reportJobValidationSchema;