const joi = require("joi");

// Create Post schema
const createPostSchema = joi.object({
    communityId: joi.string().required().label("Community ID"),
    content: joi.string().min(1).max(5000).required().trim().label("Post Content"),
    type: joi.string().valid("post", "document", "event", "poll", "file").default("post").label("Post Type"),

    // File
    file: {
        url: joi.string().uri().label("File URL"),
        name: joi.string().trim().label("File Name"),
        size: joi.number().label("File Size"),
        mimeType: joi.string().trim().label("File MIME Type")
    },

    // Event Details
    event: joi.object({
        name: joi.string().trim().label("Event Name"),
        description: joi.string().trim().label("Event Description"),
        date: joi.date().label("Event Date"),
        location: joi.string().trim().label("Event Location")
    }).when('type', { is: 'event', then: joi.required(), otherwise: joi.optional() }),

    shareTo: joi.string().valid("public", "private").default("public").label("Share To"),
    tags: joi.string().trim().allow("", null).optional().label("Tags"),

    images: joi.array().items(joi.string().trim()).default([]),
    docId: joi.string().trim().allow("", null)
});

// Update Post schema
const updatePostSchema = joi.object({
    content: joi.string().min(1).max(5000).trim().label("Post Content"),
    images: joi.array().items(joi.string().trim())
});

// Like/Unlike Post schema
const likePostSchema = joi.object({
    postId: joi.string().required().label("Post ID")
});

// Add Comment schema
const addCommentSchema = joi.object({
    postId: joi.string().required().label("Post ID"),
    content: joi.string().min(1).max(1000).required().trim().label("Comment Content")
});

module.exports = { createPostSchema, updatePostSchema, likePostSchema, addCommentSchema };
