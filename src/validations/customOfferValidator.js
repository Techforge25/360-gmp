const joi = require("joi");

const customOfferValidator = joi.object({
    sellerUserId: joi.string().required().label("Seller User ID"),
    quantity: joi.number().min(1).required().label("Quantity"),
    pricePerUnit: joi.number().min(1).required().label("Price Per Unit"),
    subTotal: joi.number().min(1).required().label("Subtotal"),
    shippingCost: joi.number().min(1).required().label("Shipping Cost"),
    method: joi.string().required().label("Shipping Method"),
    estimatedDelivery: joi.string().required().label("Estimated Delivery"),
    noteToBuyer: joi.string().allow("").label("Note to Buyer")
});

module.exports = customOfferValidator;