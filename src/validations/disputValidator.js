const joi = require("joi");

// Validation schema for creating a dispute
const createDisputeSchema = joi.object({
    // IDs of related entities
    orderId: joi.string().required().trim().label("Order ID"),
    productId: joi.string().required().trim().label("Product ID"),
    escrowId: joi.string().required().trim().label("Escrow ID"),

    // Dispute details
    reason: joi.string().required().trim().max(200).label("Reason"),
    description: joi.string().trim().max(1000).label("Description"),
    evidences: joi.array().items(joi.string()).min(1).max(5).label("Evidences")
});

module.exports = { createDisputeSchema };