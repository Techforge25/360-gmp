const joi = require("joi");

// Create admin validator
const createAdminValidator = joi.object({
    username: joi.string().trim().lowercase().min(3).max(20).required().label("Username"),
    email: joi.string().trim().lowercase().email().required().label("Email"),
    password: joi.string().trim().min(8).max(50).required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$"))
    .required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("Password"),
    allowedModules: joi.array().max(5).items(joi.string().trim()).default([]).label("Allowed modules")
});

// Update admin validator
const updateAdminValidator = joi.object({
    username: joi.string().trim().min(3).max(20).required().label("Username"),
    allowedModules: joi.array().max(5).items(joi.string().trim()).default([]).label("Allowed modules")
});

// Update admin password validator
const updateAdminPasswordValidator = joi.object({
    password: joi.string().trim().min(8).max(50).required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$"))
    .required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("Password")
});

module.exports = { createAdminValidator, updateAdminValidator, updateAdminPasswordValidator };