const Order = require("../models/orders");
const Review = require("../models/reviewsModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const reviewsValidationSchema = require("../validations/reviewsValidator");

// Create review
const createReview = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    const { userProfileId, businessProfileId, rating, comment } = validate(reviewsValidationSchema, request.body);

    // Check order and order status
    const order = await Order.findById(orderId).lean();
    if(!order) throw new ApiError(404, "Order not found");
    if(order.status !== "completed") throw new ApiError(400, "Cannot review an order that is not completed");

    // Check if the user is the buyer of the order
    if(order.buyerUserProfileId.toString() !== userProfileId.toString()) {
        throw new ApiError(403, "You are not authorized to review this order");
    }

    // Check if the businessProfileId matches the order's sellerBusinessId
    if(order.sellerBusinessId.toString() !== businessProfileId.toString()) {
        throw new ApiError(403, "You are not authorized to review this business for the order");
    }

    // Create review
    const review = await Review.create({
        orderId,
        userProfileId,
        businessProfileId,
        rating,
        comment
    });
    if(!review) throw new ApiError(500, "Failed to create review");

    // Response
    return response.status(201).json(new ApiResponse(201, review, "Review created successfully"));
});

module.exports = { createReview };