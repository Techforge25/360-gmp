const joi = require("joi");

// User signup validator
const userSignupValidator = joi.object({
    email: joi.string().trim().email().max(50).lowercase().required().label("Email"),
    passwordHash: joi.string().min(8).max(128)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$"))
    .required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("Password"),
    confirmPassword: joi.string().valid(joi.ref("passwordHash")).required().label("Confirm Password")
});

// User login validator
const userLoginValidator = joi.object({
    email: joi.string().trim().email().lowercase().required().label("Email"),
    passwordHash: joi.string().trim().required().label("Password")
});

module.exports = { userSignupValidator, userLoginValidator };