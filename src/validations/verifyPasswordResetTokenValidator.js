const joi = require("joi");

const verifyPasswordResetTokenSchema = joi.object({
    email: joi.string().trim().lowercase().email().required().label("Email address"),
    passwordResetToken: joi.string().trim().required().label("Password reset token")
});

module.exports = verifyPasswordResetTokenSchema;