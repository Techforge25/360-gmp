const joi = require("joi");

// Patterns
const usernamePattern = "^(?=[a-z0-9._@-]*[a-z0-9])[a-z0-9]+(?:[._@-]?[a-z0-9]+)*$";
const passwordPattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$";

// Valid module names
const validModuleNames = [
    "Account Management", 
    "Subscription & Access", 
    "Marketplace & Order Logs",
    "Financial Hub",
    "Communities & Networking",
    "Recruitment (Job Board)",
    "Reports"
];

// Valid module URLs
const validModuleURLs = [
    "/account-management",
    "/subscription",
    "/marketplace",
    "/finance",
    "/communities",
    "/jobs",
    "/reports"
];

// Create admin validator
const createAdminValidator = joi.object({
    username: joi.string().trim().lowercase().min(3).max(20)
    .pattern(new RegExp(usernamePattern)).required().messages({
        "string.pattern.base": "Username can only contain letters, numbers, and at most one special character (., _, or -). Spaces are not allowed."
    }).label("Username"),
    email: joi.string().trim().lowercase().email().required().label("Email"),
    password: joi.string().trim().min(8).max(50).required()
    .pattern(new RegExp(passwordPattern)).required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("Password"),
    allowedModules: joi.array().min(1).items(joi.object({
        module: joi.string().trim().required().valid(...validModuleNames).label("Module name"),
        url: joi.string().trim().required().valid(...validModuleURLs).label("Module URL")
    })).label("Allowed modules")
});

// Update admin validator
const updateAdminValidator = joi.object({
    username: joi.string().trim().lowercase().min(3).max(20)
    .pattern(new RegExp(usernamePattern)).required().messages({
        "string.pattern.base": "Username can only contain letters, numbers, and at most one special character (., _, or -). Spaces are not allowed."
    }).label("Username"),
    allowedModules: joi.array().min(1).items(joi.object({
        module: joi.string().trim().required().valid(...validModuleNames).label("Module name"),
        url: joi.string().trim().required().valid(...validModuleURLs).label("Module URL")
    })).label("Allowed modules")
});

// Update admin password validator
const updateAdminPasswordValidator = joi.object({
    password: joi.string().trim().min(8).max(50).required()
    .pattern(new RegExp(passwordPattern)).required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("Password")
});

module.exports = { createAdminValidator, updateAdminValidator, updateAdminPasswordValidator };