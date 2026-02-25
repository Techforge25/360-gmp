const joi = require("joi");

// Admin login validation schema
const adminLoginValidationSchema = joi.object({
    username: joi.string().trim().lowercase().required().label("Username"),
    password: joi.string().trim().required().label("Password")
});

module.exports = { adminLoginValidationSchema };