const joi = require("joi");

// Send warning to community validator
const warnCommunityOwnerValidator = joi.object({
    reason: joi.string().trim().min(4).max(50).required().label("Reason"),
    description: joi.string().trim().max(1000).optional().allow(null, "").label("Description")
});

module.exports = { warnCommunityOwnerValidator };