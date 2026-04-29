const { isValidObjectId } = require("mongoose");
const ProductReview = require("../models/productReviewModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { productReviewValidator } = require("../validations/productReviewValidator");
const convertToMongoId = require("../utils/convertToMongoId");
const sendNotification = require("../utils/sendNotification");
const Product = require("../models/products");

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
    const { userProfileId } = request.user.profiles || {};
    const { productId } = request.params;

    // Find product
    const product = await Product.findById(productId)
    .populate({ path:"businessId", select:"ownerUserId" })
    .select("businessId title");
    if(!product) throw new ApiError(404, "Product not found!");

    // Get validated payload
    const { rating, comment, images } = validate(productReviewValidator, request.body) || {};

    // Prevent multiple reviews
    const isExist = await ProductReview.exists({ userProfileId, productId });
    if(isExist) throw new ApiError(400, "You have already submitted a review for this product.");

    // Save to db
    const productReview = await ProductReview.create({ userProfileId, productId, rating, comment, images });
    if(!productReview) throw new ApiError(500, "Failed to submit product review");

    // Send notification to Business on product review
    await sendNotification({ 
        userId: product.businessId.ownerUserId,
        type: "BusinessProfile",
        title: "Product Review!",
        content: `Your product ${product.title} recieved a new review`,
        io: request.app.get("io")
    });   

    // Response
    return response.status(201).json(new ApiResponse(201, { rating, comment, images }, "Product review has been submitted"));
});

// Fetch product reviews
const fetchProductReviews = asyncHandler(async (request, response) => {
    const { productId } = request.params;
    const { page = 1, limit = 10 } = request.query;
    if(!isValidObjectId(productId)) throw new ApiError(400, "Invalid product ID");

    // Fetch
    const productReviews = await ProductReview.aggregatePaginate([
        { $match:{ productId: convertToMongoId(productId) } },

        // lookup
        {
            $lookup:{
                from: "userprofiles",
                localField: "userProfileId",
                foreignField: "_id",
                as: "userProfile"
            }
        },

        // Unwind
        { $unwind: "$userProfile" },

        // Projection
        { 
            $project: { 
                rating: 1, 
                comment: 1, 
                images: 1, 
                createdAt: 1, 
                user:{
                    name: "$userProfile.fullName",
                    image: "$userProfile.logo"
                }  
            } 
    }
    ], { page, limit });
    if(!productReviews) throw new ApiError(404, "Product review not found");

    // Response
    return response.status(200).json(new ApiResponse(200, productReviews, "Product reviews have been fetched"));
});

module.exports = { productReviewAccess, createProductReview, fetchProductReviews };