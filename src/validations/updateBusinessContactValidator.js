const joi = require("joi");

const updateBusinessContactValidator = joi.object({
    description: joi.string().optional().label("Description"),
    certifications: joi.array().items(joi.string()).optional().label("Certifications"),
    phone: joi.string().optional().label("Phone"),
    supportEmail: joi.string().email().optional().label("Support Email"),
    website: joi.string().uri().optional().label("Website"),
    location: joi.string().optional().label("Location")
});

module.exports = { updateBusinessContactValidator };