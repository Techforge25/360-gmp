const joi = require("joi");

const updateUserContactInfoValidationSchema = joi.object({
    // Basic info
    email: joi.string().trim().required().lowercase().label("Email"),
    phone: joi.string().trim().required().label("Phone"),
    location: joi.string().optional().label("Location")
});

module.exports = updateUserContactInfoValidationSchema;