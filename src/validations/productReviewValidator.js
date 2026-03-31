const joi = require("joi");

// Create product review validator
const productReviewValidator = joi.object({
    rating: joi.number().integer().min(1).max(5).required().label("Product rating"),
    comment: joi.string().trim().min(3).max(1000).required().label("Comment"),
    images: joi.array().items(joi.string().trim().uri()).max(3).optional().default([]).label("Images")
});

module.exports = { productReviewValidator };