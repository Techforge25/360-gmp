const joi = require("joi");

// Validation schema for creating a dispute
const createDisputeValidationSchema = joi.object({
    // Dispute details
    reason: joi.string().required().trim().max(200).label("Reason"),
    description: joi.string().trim().required().max(5000).label("Description"),
    evidences: joi.array().items(joi.string().trim().uri()).max(5).optional().default([]).label("Evidences")
});

// Seller response validator
const sellerResponseValidationSchema = joi.object({
    description: joi.string().trim().required().max(5000).label("Description"),
    evidences: joi.array().items(joi.string().trim().uri()).max(5).optional().default([]).label("Evidences")
});

// Dispute status validation schema (for admin)
const changeDisputeStatusValidationSchema = joi.object({
    status: joi.string().required().valid("under_review", "waiting_seller").label("Status")
});

// Admin decision validation schema
const adminDecisionValidationSchema = joi.object({
    adminDecision: joi.string().required().valid("full_refund", "partial_refund", "reject").label("Admin Decision"),

    refundAmount: joi.number().min(0).label("Refund Amount").when("adminDecision", {
        is: ["full_refund", "partial_refund"],
        then: joi.required(),
        otherwise: joi.forbidden()
    }),

    adminNotes: joi.string().trim().max(2000).label("Admin Notes")
});

module.exports = { createDisputeValidationSchema, sellerResponseValidationSchema,
changeDisputeStatusValidationSchema, adminDecisionValidationSchema };