const Dispute = require("../models/disputeModel");
const Order = require("../models/orders");
const Product = require("../models/products");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createDisputeSchema } = require("../validations/disputValidator");

// Create dispute
const createDispute = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Get validated payload
    const { orderId, productId, escrowId, reason, description, evidences } = validate(createDisputeSchema, request.body);

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

module.exports = { createDispute };