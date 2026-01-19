const joi = require("joi");

const updateBusinessContactValidator = joi.object({
    description: joi.string().optional().label("Description"),
    certifications: joi.array().items(joi.string().trim().min(1)).optional().label("Certifications"),
    phone: joi.string().pattern(/^[0-9+()\-\s]+$/).optional().label("Phone"),
    supportEmail: joi.string().email().optional().label("Support Email"),
    website: joi.string().uri().optional().label("Website"),
    location: joi.object({
        country: joi.string().optional().label("Country"),
        city: joi.string().optional().label("City"),
        addressLine: joi.string().optional().label("Address Line"),
    }).optional().label("Location")
});

module.exports = { updateBusinessContactValidator };