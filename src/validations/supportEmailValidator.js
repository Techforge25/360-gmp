const joi = require("joi");

const supportEmailValidationSchema = joi.object({
    userId: joi.string().required().label("User ID"),
    subject: joi.string().max(50).min(5).required().label("Subject"),
    category: joi.string().required().label("Category"),
    description: joi.string().required().label("Description"),
    fileType: joi.string().optional().label("File type"),
    fileURL: joi.string().optional().label("File URL")
});

module.exports = supportEmailValidationSchema;