const { isValidObjectId } = require("mongoose");
const Order = require("../models/orders");
const Product = require("../models/products");
const ProductReview = require("../models/productReviewModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { productReviewValidator } = require("../validations/productReviewValidator");

// Product review access (Check if user purchased this product)
const productReviewAccess = asyncHandler(async (request, response) => {
    const hasPurchased = request.hasPurchased;
    
    // Response message
    const message = hasPurchased ? "You are allowed to give a review for this product." : "You are not allowed to give a review for this product.";

    // Response
    return response.status(200).json(new ApiResponse(200, { hasPurchased: Boolean(hasPurchased) }, message));
});

// Create product review
const createProductReview = asyncHandler(async (request, response) => {
    const hasPurchased = request.hasPurchased;
    if(!hasPurchased) throw new ApiError(400, "You are not allowed to give a review for this product.");

    // Get IDs
    const { userProfileId } = request.user.profiles;
    const { productId } = request.params;

    // Get validated payload
    const { rating, comment, images } = validate(productReviewValidator, request.body) || {};

    // Save to db
    const productReview = await ProductReview.create({ userProfileId, productId, rating, comment, images });
    if(!productReview) throw new ApiError(500, "Failed to create product review");

    // Response
    return response.status(201).json(new ApiResponse(201, { rating, comment, images }, "Product review has been created"));
});

module.exports = { productReviewAccess, createProductReview };