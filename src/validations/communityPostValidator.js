const joi = require("joi");

// Create Post schema
const createPostSchema = joi.object({
    // References
    communityId: joi.string().required().label("Community ID"),
    type: joi.string().valid("post", "file", "document", "event", "poll").default("post").label("Post Type"),

    // Simple content for post
    content: joi.string().min(1).max(5000).trim()
    .when('type', { is: 'post', then: joi.required(), otherwise: joi.optional() }).label("Post Content"),

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
    }).when('type', { is: 'event', then: joi.required(), otherwise: joi.optional() }).label("Event Details"),

    // Poll Details
    poll: joi.object({
        question: joi.string().trim().required().label("Poll Question"),

        options: joi.array().items(joi.object({
            option: joi.string().trim().label("Poll Option")
        })).min(2).max(10).label("Poll Options"),

        duration: joi.date().label("Poll Duration")
    }).when('type', { is: 'poll', then: joi.required(), otherwise: joi.optional() }).label("Poll Details"),

    // Post Sharing
    shareTo: joi.string().valid("public", "private").default("public").label("Share To"),
    tags: joi.string().trim().allow("", null).optional().label("Tags"),

    images: joi.array().items(joi.string().trim()).default([]),
    docId: joi.string().trim().allow("", null)
});

// Update Post schema
const updatePostSchema = joi.object({
    // Post Type
    type: joi.string().valid("post", "file", "document", "event", "poll").default("post").label("Post Type"),

    // Simple content for post
    content: joi.string().min(1).max(5000).trim().label("Post Content")
    .when('type', { is: 'post', then: joi.required(), otherwise: joi.optional() }).label("Post Content"),

    // Event Details
    event: joi.object({
        name: joi.string().trim().label("Event Name"),
        description: joi.string().trim().label("Event Description"),
        date: joi.date().label("Event Date"),
        location: joi.string().trim().label("Event Location")
    }).when('type', { is: 'event', then: joi.required(), otherwise: joi.optional() }).label("Event Details"),

    // Poll Details
    poll: joi.object({
        question: joi.string().trim().required().label("Poll Question"),
        options: joi.array().items(joi.object({
            option: joi.string().trim().label("Poll Option")
        })).min(2).max(10).label("Poll Options"),
        duration: joi.date().label("Poll Duration")
    }).when('type', { is: 'poll', then: joi.required(), otherwise: joi.optional() }).label("Poll Details"),

    // Post Sharing
    shareTo: joi.string().valid("public", "private").default("public").label("Share To"),
    tags: joi.string().trim().allow("", null).optional().label("Tags"),

    images: joi.array().items(joi.string().trim()).default([]),
    docId: joi.string().trim().allow("", null)    
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
