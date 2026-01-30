const joi = require("joi");

const withdrawFundsValidationSchema = joi.object({
    ownerModel: joi.string().trim().valid("BusinessProfile", "UserProfile").required().label("Owner model"),
    withdrawalAmount: joi.number().min(200).max(1000).required().label("Withdrawal amount").messages({
        "number.min": "{{#label}} cannot be less than 200",
        "number.max": "{{#label}} cannot be more than 1000"
    })
});

module.exports = withdrawFundsValidationSchema;