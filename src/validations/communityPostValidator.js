const joi = require("joi");

// Create Post schema
const createPostSchema = joi.object({
    // References
    communityId: joi.string().required().label("Community ID"),
    type: joi.string().valid("post", "event", "poll", "file", "document").default("post").label("Post Type"),

    // Simple content for post
    content: joi.string().min(1).max(5000).trim()
    .when('type', { is: ['post'], then: joi.required(), otherwise: joi.forbidden() }).label("Post Content"), 

    // File
    file: joi.string().trim()
    .when('type', { is: 'post', then: joi.optional(), otherwise: joi.forbidden() }).label("File"),

    // Document
    document: joi.string().trim().uri()
    .when('type', { is: ['post'], then: joi.optional(), otherwise: joi.forbidden() }).label("Document"),     

    images: joi.array().items(joi.string().trim()).default([]),
    docId: joi.string().trim().allow("", null)
});

// Update Post schema
const updatePostSchema = joi.object({
    // References
    communityId: joi.string().required().label("Community ID"),
    type: joi.string().valid("post", "event", "poll").default("post").label("Post Type"),

    // Simple content for post
    content: joi.string().min(1).max(5000).trim().label("Post Content")
    .when('type', { is: 'post', then: joi.required(), otherwise: joi.optional() }).label("Post Content"),

    // Document
    document: joi.string().trim().uri()
    .when('type', { is: ['post'], then: joi.optional(), otherwise: joi.forbidden() }).label("Document"),      

    images: joi.array().items(joi.string().trim()).default([])  
});

module.exports = { createPostSchema, updatePostSchema };
