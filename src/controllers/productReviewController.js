const { isValidObjectId } = require("mongoose");
const Order = require("../models/orders");
const Product = require("../models/products");
const ProductReview = require("../models/productReviewModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");

// Product review access (Check if user purchased this product)
const productReviewAccess = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};
    const { productId } = request.params;

    // Validate ID
    if(!isValidObjectId(productId)) throw new ApiError(400, "Invalid MongoDB ID! Please provide a valid product ID");

    // Check
    const hasPurchased = await Order.exists({ buyerUserProfileId:userProfileId, status:"completed", "items.productId":productId });

    // Response message
    const message = hasPurchased ? "You are allowed to give a review for this product." : "You are not allowed to give a review for this product.";

    // Response
    return response.status(200).json(new ApiResponse(200, { hasPurchased: Boolean(hasPurchased) }, message));
});

module.exports = { productReviewAccess };