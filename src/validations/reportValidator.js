const joi = require("joi");

// Report job validation schema
const createReportValidator = joi.object({
    // References
    reportedContentId: joi.string().trim().length(24).required().label("Reported Content ID"),
    reportedModel: joi.string().trim().required().valid("BusinessProfile", "Product", "Job", "Community").label("Reported Model"),

    // Details
    reason: joi.string().trim().required().label("Reason"),
    description: joi.string().trim().required().label("Description")
});

module.exports = { createReportValidator };