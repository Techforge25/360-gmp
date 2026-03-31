const { isValidObjectId } = require("mongoose");
const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const Order = require("../models/orders");

const hasProductPurchased = asyncHandler(async (request, response, next) => {
    const { userProfileId } = request.user.profiles || {};
    const { productId } = request.params;

    // Validate ID
    if(!userProfileId) throw new ApiError(400, "User profile ID is missing");
    if(!isValidObjectId(productId)) throw new ApiError(400, "Invalid MongoDB ID! Please provide a valid product ID");

    // Check
    const hasPurchased = await Order.exists({ buyerUserProfileId:userProfileId, status:"completed", "items.productId":productId }); 
    request.hasPurchased = hasPurchased;
    
    return next();
});

module.exports = { hasProductPurchased };