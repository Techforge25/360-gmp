const joi = require("joi");

// Post comment validator
const postCommentValidator = joi.object({
    content: joi.string().trim().max(1000).required().label("Comment")
});

module.exports = { postCommentValidator };