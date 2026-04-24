const joi = require("joi");

// Validation schema for creating a testimonial
const createTestimonialValidationSchema = joi.object({
    rating: joi.number().integer().min(1).max(5).required().label("Rating"),
    title: joi.string().trim().max(50).optional().label("Testimonial Title"),
    description: joi.string().trim().max(1000).required().label("Testimonial Description")
});

// Flag testimonial validator
const flagTestimonialValidationSchema = joi.object({
    flagReason: joi.string().trim().min(5).max(1000).required().label("Flag reason"),
});

module.exports = { createTestimonialValidationSchema, flagTestimonialValidationSchema };