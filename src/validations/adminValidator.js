const joi = require("joi");

// Create admin validator
const createAdminValidator = joi.object({
    username: joi.string().trim().min(3).max(20).required().label("Username"),
    password: joi.string().trim().min(3).max(50).required()
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$"))
    .required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("Password"),
    allowedModules: joi.array().max(5).items(joi.string().trim()).default([]).label("Allowed modules")
});

// Assign module to admin validator
const assignModuleValidator = joi.object({
    allowedModules: joi.array().max(5).items(joi.string().trim()).default([]).label("Allowed modules")
});

module.exports = { createAdminValidator, assignModuleValidator };