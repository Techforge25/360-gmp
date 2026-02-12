const { isValidObjectId } = require("mongoose");
const Dispute = require("../models/disputeModel");
const Order = require("../models/orders");
const Product = require("../models/products");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createDisputeValidationSchema, changeDisputeStatusValidationSchema, 
adminDecisionValidationSchema } = require("../validations/disputeValidator");
const { emptyList } = require("../constants");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const mongoose = require("mongoose");

// Create dispute
const createDispute = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Get validated payload
    const { orderId, productId, escrowId, reason, description, evidences } = validate(createDisputeValidationSchema, request.body) || {};

    // Validate object ids
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid orderId");
    if(!isValidObjectId(productId)) throw new ApiError(400, "Invalid productId");
    if(!isValidObjectId(escrowId)) throw new ApiError(400, "Invalid escrowId");

    // Check if product belongs to the business
    const product = await Product.findById(productId).select("businessId").lean();
    if(!product) throw new ApiError(404, "Product not found");

    // Check if user profile actually purchased the product
    const order = await Order.findOne({ _id:orderId, buyerUserProfileId:userProfileId, "items.productId":productId }).select("_id").lean();
    if(!order) throw new ApiError(403, "You can only dispute products you have purchased");

    // Create dispute    
    const dispute = await Dispute.create({ orderId, productId, escrowId, buyerId:userProfileId, 
    sellerId:product.businessId, reason, description, evidences });
    if(!dispute) throw new ApiError(500, "Failed to create dispute");

    // Response
    return response.status(201).json(new ApiResponse(201, dispute, "Dispute created successfully"));
});

// Fetch disputes (admin only) - can add filters later
const fetchDisputes = asyncHandler(async (request, response) => {
    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Options
    const options = {
        page: Number(page),
        limit: Number(limit),
        sort: { createdAt: -1 },
        populate: [
            { path: "orderId", select: "totalAmount status shippingAddress" },
            { path: "productId", select: "title image detail category pricePerUnit tieredPricing minOrderQty stockQty status" },
            { path: "escrowId", select: "totalAmount platformFee netAmount status paymentMethod" },
            { path: "buyerId", select: "userId fullName email phone" },
            { path: "sellerId", select: "ownerUserId companyName businessType location b2bContact" }
        ]
    };

    // Dispute fetching with pagination
    const disputes = await Dispute.paginate({}, options);
    if(!disputes.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No disputes found"));

    // Response
    return response.status(200).json(new ApiResponse(200, disputes, "Disputes fetched successfully"));
});

// View dispute details (admin only)
const viewDisputeDetails = asyncHandler(async (request, response) => {
    const { disputeId } = request.params;
    if(!isValidObjectId(disputeId)) throw new ApiError(400, "Invalid disputeId");

    // Fetch dispute with related details
    const dispute = await Dispute.findById(disputeId)
    .populate([
        { path: "orderId", select: "totalAmount status shippingAddress" },
        { path: "productId", select: "title image detail category pricePerUnit tieredPricing minOrderQty stockQty status" },
        { path: "escrowId", select: "totalAmount platformFee netAmount status paymentMethod" },
        { path: "buyerId", select: "userId fullName email phone" },
        { path: "sellerId", select: "ownerUserId companyName businessType location b2bContact" }
    ]);
    if(!dispute) throw new ApiError(404, "Dispute not found");

    // Response
    return response.status(200).json(new ApiResponse(200, dispute, "Dispute details fetched successfully"));
});

// Change dispute status (admin only) - can be used to implement resolution actions later
const changeDisputeStatus = asyncHandler(async (request, response) => {
    const { disputeId } = request.params;
    if(!isValidObjectId(disputeId)) throw new ApiError(400, "Invalid disputeId");

    // Validate new status
    const { status } = validate(changeDisputeStatusValidationSchema, request.body);

    // Update dispute status
    const updatedDispute = await Dispute.findByIdAndUpdate(disputeId, { status }, { new: true });
    if(!updatedDispute) throw new ApiError(404, "Dispute not found");

    // Response
    return response.status(200).json(new ApiResponse(200, updatedDispute, "Dispute status updated successfully"));
}); 

// Admin decision
const adminDecision = asyncHandler(async (request, response) => {
    const { disputeId } = request.params;
    if(!isValidObjectId(disputeId)) throw new ApiError(400, "Invalid disputeId");

    // Validate admin decision details
    const { adminDecision, refundAmount = 0, adminNotes } = validate(adminDecisionValidationSchema, request.body);

    // Cases for refund decisions
    if(adminDecision === "reject") 
    {
        // Just update the dispute with admin decision and notes
        const updatedDispute = await Dispute.findByIdAndUpdate(disputeId, { adminDecision, adminNotes, status:"closed" }, { new: true });
        if(!updatedDispute) throw new ApiError(404, "Dispute not found");
        return response.status(200).json(new ApiResponse(200, updatedDispute, "Admin decision recorded successfully"));
    }

    // Get order ID
    const dispute = await Dispute.findById(disputeId).select("orderId").lean();
    if(!dispute) throw new ApiError(404, "Dispute not found");

    // Get total amount
    const escrow = await EscrowTransaction.findOne({ orderId:dispute.orderId })
    .select("totalAmount platformFee netAmount status paymentMethod");
    if(!escrow) throw new ApiError(404, "Escrow transaction not found");

    if(adminDecision === "full_refund" || (adminDecision === "partial_refund" && refundAmount > 0))
    {
        // Refund full amount to buyer's wallet
        const buyerWallet = await Wallet.findOne({ ownerId: dispute.buyerId, ownerModel: "UserProfile" });
        if(!buyerWallet) throw new ApiError(404, "Buyer wallet not found");

        // Start db transaction session
        const dbSession = await mongoose.startSession();
        dbSession.startTransaction();

        try
        {
            // Update wallet balances
            buyerWallet.availableBalance += Number(refundAmount);
            await buyerWallet.save({ session: dbSession });

            // Update escrow status to refunded
            escrow.totalAmount = adminDecision === "full_refund" ? 0 : (Number(escrow.totalAmount) - Number(refundAmount));
            escrow.platformFee = adminDecision === "full_refund" ? 0 : (Number(escrow.platformFee) - (Number(refundAmount) * 0.1)); // Assuming platform fee is 10%
            escrow.netAmount = adminDecision === "full_refund" ? 0 : (Number(escrow.netAmount) - (Number(refundAmount) * 0.9)); // Rest goes to seller
            escrow.status = "refunded";
            await escrow.save({ session: dbSession });

            // Update dispute with refund details
            const updatedDispute = await Dispute.findByIdAndUpdate(disputeId, 
                { adminDecision, refundAmount, adminNotes, status:"closed" }, 
                { new: true, session: dbSession }
            );
            if(!updatedDispute) throw new ApiError(404, "Dispute not found");

            // Commit transaction
            await dbSession.commitTransaction();
            dbSession.endSession();

            // Response
            return response.status(200).json(new ApiResponse(200, updatedDispute, "Admin decision recorded successfully"));
        }
        catch(error)
        {
            await dbSession.abortTransaction();
            dbSession.endSession();
            throw error;
        }
    }

    // Fallback response
    return response.status(200).json(new ApiResponse(200, null, "Admin decision recorded successfully"));
});

module.exports = { createDispute, fetchDisputes, viewDisputeDetails, changeDisputeStatus, adminDecision };