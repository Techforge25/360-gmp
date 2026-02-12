const { isValidObjectId } = require("mongoose");
const Dispute = require("../models/disputeModel");
const Order = require("../models/orders");
const Product = require("../models/products");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createDisputeSchema } = require("../validations/disputValidator");
const { emptyList } = require("../constants");

// Create dispute
const createDispute = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Get validated payload
    const { orderId, productId, escrowId, reason, description, evidences } = validate(createDisputeSchema, request.body) || {};

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

module.exports = { createDispute, fetchDisputes, viewDisputeDetails };