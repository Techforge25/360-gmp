const joi = require("joi");

// Validation schema for creating a testimonial
const createTestimonialValidationSchema = joi.object({
    rating: joi.number().integer().min(1).max(5).required().label("Rating (1-5)"),
    title: joi.string().trim().max(50).optional().label("Testimonial Title"),
    description: joi.string().trim().max(1000).required().label("Testimonial Description")
});

module.exports = { createTestimonialValidationSchema };