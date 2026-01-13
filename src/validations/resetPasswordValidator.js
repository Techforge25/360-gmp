const joi = require("joi");

// Reset password schema
const resetPasswordSchema = joi.object({
    newPassword: joi.string().min(6).max(20).required().label("New Password"),
    confirmPassword: joi.string().valid(joi.ref("newPassword")).required().label("Confirm Password")
});

module.exports = resetPasswordSchema;