const BusinessProfile = require("../models/businessProfileSchema");
const CustomOffer = require("../models/customOfferModel");
const Product = require("../models/products");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const customOfferValidator = require("../validations/customOfferValidator");

// Create custom offer
const createCustomOffer = asyncHandler(async (request, response) => {
    const { buyerUserProfileId, productId, quantity, pricePerUnit, subTotal, 
    shippingCost, shippingMethod, estimatedDelivery, noteToBuyer } = validate(customOfferValidator, request.body);

    // Validate sub total
    const calcultatedSubTotal = Number(quantity) * Number(pricePerUnit);
    if(Number(subTotal) !== Number(calcultatedSubTotal)) throw new ApiError(400, "Invalid subtotal amount");

    // Check product
    const product = await Product.findById(productId).select("_id").lean();
    if(!product) throw new ApiError(404, "Product not found");

    // Check if business profile and user profile exist
    const [businessProfile, userProfile] = await Promise.all([
        BusinessProfile.findOne({ ownerUserId:request.user._id }).select("_id").lean(),
        UserProfile.findById(buyerUserProfileId).select("_id").lean()
    ]);
    if(!businessProfile) throw new ApiError(404, "Seller business profile not found");
    if(!userProfile) throw new ApiError(404, "Buyer user profile not found");

    // Save to db
    const customOffer = await CustomOffer.create({
        buyerUserProfileId: userProfile._id,
        sellerBusinessProfileId: businessProfile._id,
        productId:product._id,
        quantity: Number(quantity),
        pricePerUnit: Number(pricePerUnit),
        subTotal: Number(subTotal),
        shippingCost: Number(shippingCost),
        shippingMethod,
        estimatedDelivery,
        noteToBuyer
    });
    if(!customOffer) throw new ApiError(500, "Failed to create custom offer");

    // Response
    return response.status(201).json(new ApiResponse(201, { customOfferId:customOffer._id }, "Custom offer created successfully"));
});

// Get custom offer
const getCustomOffer = asyncHandler(async (request, response) => {
    const { customOfferId } = request.params;

    // Get custom offer
    const customOffer = await CustomOffer.findById(customOfferId)
    .select("-buyerUserProfileId -sellerBusinessProfileId -productId -updatedAt -__v").lean();
    if(!customOffer) throw new ApiError(404, "Custom offer not found");

    // Response
    return response.status(200).json(new ApiResponse(200, customOffer, "Custom offer fetched successfully"));
});

// Accept custom offer
const acceptCustomOffer = asyncHandler(async (request, response) => {
    const { customOfferId } = request.params;
    const { status } = request.body || {};
    if(!["accepted", "rejected"].includes(status)) throw new ApiError(400, "Invalid status value");

    // Get user profile
    const userId = request.user._id;
    const userProfile = await UserProfile.findOne({ userId }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Find custom offer and verify
    const customOffer = await CustomOffer.findById(customOfferId);
    if(!customOffer) throw new ApiError(404, "Custom offer not found");

    // Verify ownership and status
    if(String(customOffer.buyerUserProfileId) !== String(userProfile._id)) throw new ApiError(403, "You are not authorized to accept this custom offer");
    if(customOffer.status !== "pending") throw new ApiError(400, `Custom offer has already been ${customOffer.status}`);
    
    // Update status
    customOffer.status = status;
    await customOffer.save();

    // Response
    return response.status(200).json(new ApiResponse(200, null, `Custom offer ${status} successfully`));
});

module.exports = { createCustomOffer, getCustomOffer, acceptCustomOffer };