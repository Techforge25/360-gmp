const joi = require("joi");

const withdrawFundsValidationSchema = joi.object({
    ownerModel: joi.string().trim().valid("BusinessProfile", "UserProfile").required().label("Owner model"),
});

module.exports = withdrawFundsValidationSchema;