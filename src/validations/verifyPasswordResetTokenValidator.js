const joi = require("joi");

const verifyPasswordResetTokenSchema = joi.object({
    email: joi.string().email().required(),
    passwordResetToken: joi.string().required()
});

module.exports = verifyPasswordResetTokenSchema;