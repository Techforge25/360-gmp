const Joi = require("joi");

const userSignupSchema = Joi.object({
    email: Joi.string().trim().email().max(50).lowercase().required().label("Email"),
    passwordHash: Joi.string().min(8).max(128)
    .pattern(new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$"))
    .required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("Password"),
    confirmPassword: Joi.string().valid(Joi.ref("passwordHash")).required().label("Confirm Password")
});

module.exports = { userSignupSchema };