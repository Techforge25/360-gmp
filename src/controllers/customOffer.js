const BusinessProfile = require("../models/businessProfileSchema");
const CustomOffer = require("../models/customOfferModel");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const customOfferValidator = require("../validations/customOfferValidator");

// Create custom offer
const createCustomOffer = asyncHandler(async (request, response) => {
    const { buyerBusinessProfileId, sellerUserId, quantity, pricePerUnit, subTotal, 
    shippingCost, method, estimatedDelivery, noteToBuyer } = validate(customOfferValidator, request.body);

    // Validate sub total
    const calcultatedSubTotal = Number(quantity) * Number(pricePerUnit);
    if(Number(subTotal) !== Number(calcultatedSubTotal)) throw new ApiError(400, "Invalid subtotal amount");

    // Check if business profile and user profile exist
    const [businessProfile, userProfile] = await Promise.all([
        BusinessProfile.findById(buyerBusinessProfileId).select("_id").lean(),
        UserProfile.findById(sellerUserId).select("_id").lean()
    ]);
    if(!businessProfile) throw new ApiError(404, "Buyer business profile not found");
    if(!userProfile) throw new ApiError(404, "Seller user profile not found");

    // Save to db
    const customOffer = await CustomOffer.create({
        buyerBusinessProfileId,
        sellerUserId,
        quantity: Number(quantity),
        pricePerUnit: Number(pricePerUnit),
        subTotal: Number(subTotal),
        shippingCost: Number(shippingCost),
        method,
        estimatedDelivery,
        noteToBuyer
    });
    if(!customOffer) throw new ApiError(500, "Failed to create custom offer");

    // Response
    return response.status(201).json(new ApiResponse(201, null, "Custom offer created successfully"));
});

module.exports = { createCustomOffer };