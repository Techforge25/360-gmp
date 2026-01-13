const joi = require("joi");

const verifyPasswordResetTokenSchema = joi.object({
    email: joi.string().email().required(),
    verifyResetToken: joi.string().required()
});

module.exports = verifyPasswordResetTokenSchema;