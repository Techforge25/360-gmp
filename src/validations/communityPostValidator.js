const Joi = require("joi");

// Create Post schema
const createPostSchema = Joi.object({
    communityId: Joi.string().required().label("Community ID"),
    content: Joi.string().min(1).max(5000).required().trim().label("Post Content"),
    type: Joi.string().valid("post", "document", "event", "poll", "file").default("post").label("Post Type"),

    file: {
        url: Joi.string().uri().label("File URL"),
        name: Joi.string().trim().label("File Name"),
        size: Joi.number().label("File Size"),
        mimeType: Joi.string().trim().label("File MIME Type")
    },
    images: Joi.array().items(Joi.string().trim()).default([]),
    docId: Joi.string().trim().allow("", null)
});

// Update Post schema
const updatePostSchema = Joi.object({
    content: Joi.string().min(1).max(5000).trim().label("Post Content"),
    images: Joi.array().items(Joi.string().trim())
});

// Like/Unlike Post schema
const likePostSchema = Joi.object({
    postId: Joi.string().required().label("Post ID")
});

// Add Comment schema
const addCommentSchema = Joi.object({
    postId: Joi.string().required().label("Post ID"),
    content: Joi.string().min(1).max(1000).required().trim().label("Comment Content")
});

module.exports = { createPostSchema, updatePostSchema, likePostSchema, addCommentSchema };
