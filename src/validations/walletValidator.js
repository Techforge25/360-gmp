const joi = require("joi");

// Validation schema for transferring funds between business and user
const transferFundsValidator = joi.object({
    amount: joi.number().integer().positive().min(100).max(10000).required().label("Amount to transfer"),
    recipientType: joi.string().valid("user", "business").required().label("Recipient type (user or business)")
});

// Add funds by user validator
const addFundsUserValidator = joi.object({
    funds: joi.number().positive().min(100).required().label("Funds"),
});

module.exports = { transferFundsValidator };