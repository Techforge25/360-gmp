const joi = require("joi");

// Create Post schema
const createPostSchema = joi.object({
    // References
    communityId: joi.string().required().label("Community ID"),
    type: joi.string().valid("post", "document").default("post").label("Post Type"),

    // Simple content for post
    content: joi.string().min(1).max(5000).trim().label("Post Content"),

    // File
    file: joi.string().trim().optional().allow(null, "").label("File")
});

module.exports = { createPostSchema };
