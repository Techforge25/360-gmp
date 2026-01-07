const Joi = require("joi");

// Create Post schema
const createPostSchema = Joi.object({
    communityId: Joi.string().required().messages({
        "any.required": "Community ID is required"
    }),
    content: Joi.string().min(1).max(5000).required().trim().messages({
        "any.required": "Post content is required",
        "string.min": "Post content cannot be empty",
        "string.max": "Post content must not exceed 5000 characters"
    }),
    images: Joi.array().items(Joi.string().trim()).default([]),
    docId: Joi.string().trim().allow("", null)
});

// Update Post schema
const updatePostSchema = Joi.object({
    content: Joi.string().min(1).max(5000).trim().messages({
        "string.min": "Post content cannot be empty",
        "string.max": "Post content must not exceed 5000 characters"
    }),
    images: Joi.array().items(Joi.string().trim())
});

// Like/Unlike Post schema
const likePostSchema = Joi.object({
    postId: Joi.string().required().messages({
        "any.required": "Post ID is required"
    })
});

// Add Comment schema
const addCommentSchema = Joi.object({
    postId: Joi.string().required().messages({
        "any.required": "Post ID is required"
    }),
    content: Joi.string().min(1).max(1000).required().trim().messages({
        "any.required": "Comment content is required",
        "string.min": "Comment content cannot be empty",
        "string.max": "Comment content must not exceed 1000 characters"
    })
});

module.exports = {
    createPostSchema,
    updatePostSchema,
    likePostSchema,
    addCommentSchema
};
