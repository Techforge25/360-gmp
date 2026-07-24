const joi = require("joi");

// Report job validation schema
const createReportValidator = joi.object({
    // References
    reportedContentId: joi.string().trim().length(24).required().label("Reported Content ID"),
    reportedModel: joi.string().trim().required().valid("BusinessProfile", "Product", "Job", "Community").label("Reported Model"),

    // Details
    reason: joi.string().trim().min(5).max(100).required().label("Reason"),
    media: joi.array().max(3).items(joi.string().trim()),
    description: joi.string().trim().min(5).max(2000).required().label("Description")
});

module.exports = { createReportValidator };