const joi = require("joi");

// Report job validation schema
const reportValidationSchema = joi.object({
    // References
    reportedModel: joi.string().trim().required().valid("Job", "Community", "CommunityPost").label("Reported Model"),
    reportedContentId: joi.string().trim().required().label("Reported Content ID"),
    reportedCommentId: joi.string().trim().optional().allow("", null).label("Reported Comment ID"),

    // Details
    subject: joi.string().trim().required().label("Subject"),
    category: joi.string().trim().required().label("Category"),
    description: joi.string().trim().optional().label("Description"),
    evidences: joi.array().items(joi.string().trim()).label("Evidence images")
});

module.exports = reportValidationSchema;