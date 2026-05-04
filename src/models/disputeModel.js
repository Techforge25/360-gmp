const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");

// Schema
const disputeSchema = new Schema({
    // References
    orderId: { type: Schema.Types.ObjectId, ref: "Order", required: true, unique:[true, "Only one dispute per order is allowed"] },
    buyerId: { type: Schema.Types.ObjectId, ref: "UserProfile", required: true },
    sellerId: { type: Schema.Types.ObjectId, ref: "BusinessProfile", required: true },

    // Dispute details
    reason: { type: String, required: true, trim: true },
    description: { type: String, trim: true },

    // Evidence - array of image URLs (max 5)
    evidences: { 
        type: [String],
        validate: {
            validator: v => v.length <= 5,
            message: "Maximum 5 evidence images allowed"
        }
    },

    // Seller response
    sellerResponse: {
        description: { type: String, trim: true },

        // Evidence - array of image URLs (max 5)
        evidences: { 
            type: [String],
            validate: {
                validator: v => v.length <= 5,
                message: "Maximum 5 evidence images allowed"
            }
        },

        // Timestamp
        responseAt: { type:Date }
    },
    // Flag
    sellerResponseStatus: { type:Boolean, default:false },

    // Dispute resolution
    status: { type: String, enum: ["open", "under_review", "waiting_seller", "resolved", "closed"], default: "open" },

    // Admin resolution details
    adminDecision: { type: String, enum: ["full_refund", "partial_refund", "reject"], default: null },

    // Amount to refund if admin decides to refund 
    refundAmount: { type: Number, default: 0 },

    // Internal notes for admins
    adminNotes: { type: String, trim: true, required:true }
}, { timestamps: true });

// Apply pagination plugin
disputeSchema.plugin(paginate);

// Model
const Dispute = model("Dispute", disputeSchema);

module.exports = Dispute;