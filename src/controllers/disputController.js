const { isValidObjectId } = require("mongoose");
const Dispute = require("../models/disputeModel");
const Order = require("../models/orders");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createDisputeValidationSchema, changeDisputeStatusValidationSchema, 
adminDecisionValidationSchema } = require("../validations/disputeValidator");
const EscrowTransaction = require("../models/escrowTrasanction");
const Wallet = require("../models/walletModel");
const mongoose = require("mongoose");

// Create dispute
const createDispute = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};
    const { orderId } = request.params;

    // Validate
    if(!userProfileId) throw new ApiError(400, "User profile ID is missing");
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid MongoDB ID! Please provide a valid Order ID");

    // Get validated payload
    const { reason, description, evidences } = validate(createDisputeValidationSchema, request.body) || {};

    // Find order in escrow
    const escrow = await EscrowTransaction.findOne({ orderId })
    .populate({ path:"orderId", select:"status" })
    .lean();

    // Checks
    if(!escrow) throw new ApiError(404, "Order not found in escrow history");
    if(String(userProfileId) !== String(escrow.buyerId)) throw new ApiError(403, "You can only dispute those orders that you have purchased");
    if(escrow.orderId?.status !== "delivered") throw new ApiError(403, "You can only submit a dispute when the order is in delivered state");

    // Prevent duplication
    const isExist = await Dispute.exists({ orderId });
    if(isExist) throw new ApiError(400, "You can create a dispute only once for each order");

    // Create dispute    
    const dispute = await Dispute.create({ 
        orderId, 
        buyerId: escrow.buyerId, 
        sellerId: escrow.sellerId, 
        reason, 
        description, 
        evidences 
    });
    if(!dispute) throw new ApiError(500, "Failed to create dispute");

    // Response
    return response.status(201).json(new ApiResponse(201, dispute, "Dispute created successfully"));
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

module.exports = { createDispute, viewDisputeDetails, changeDisputeStatus, adminDecision };