const BusinessProfile = require("../models/businessProfileSchema");
const CustomOffer = require("../models/customOfferModel");
const Product = require("../models/products");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

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

module.exports = { getCustomOffer, acceptCustomOffer };