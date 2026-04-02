const joi = require("joi");

const passwordPattern = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&^#()[\\]{}|\\\\<>+=._-])[A-Za-z\\d@$!%*?&^#()[\\]{}|\\\\<>+=._-]+$";

// Reset password schema
const resetPasswordSchema = joi.object({ 
    newPassword: joi.string().min(8).max(128)
    .pattern(new RegExp(passwordPattern)).required().messages({
        "string.pattern.base": "Password must contain at least one uppercase letter, one lowercase letter, one digit, and one special character.",
        "string.min": "Password must be at least 8 characters long."
    }).label("New password"),    
    confirmPassword: joi.string().valid(joi.ref("newPassword")).required().label("Confirm password")
});

module.exports = resetPasswordSchema;