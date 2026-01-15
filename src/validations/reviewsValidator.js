const joi = require("joi");

// Review validation schema
const reviewsValidationSchema = joi.object({
    userProfileId: joi.string().required().label("User Profile ID"),
    businessProfileId: joi.string().required().label("Business Profile ID"),
    rating: joi.number().min(1).max(5).required().label("Rating"),
    comment: joi.string().max(1000).optional().trim().label("Comment")
});

module.exports = reviewsValidationSchema;