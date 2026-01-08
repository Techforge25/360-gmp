const Order = require("../models/orders");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Create order
const createOrder = asyncHandler(async (request, response) => {
    // Validate user profile
    const { _id } = request.user;
    const userProfile = await UserProfile.findOne({ userId:_id }).select("_id").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found! Invalid user profile ID");

    // Validate json data
    const { totalAmount, shippingAddress, items } = request.body;
    if(!totalAmount) throw new ApiError(400, "Amount is required");
    if(!shippingAddress) throw new ApiError(400, "Shipping address is required");
    if(!items) throw new ApiError(400, "Product item is required");

    // Save to db
    const order = await Order.create({ buyerUserProfileId:userProfile._id, totalAmount, status:"pending", shippingAddress, items });
    if(!order) throw new ApiError(500, "Failed to create an order");

    // Response
    return response.status(201).json(new ApiResponse(201, items, "Order has been created"));
});

module.exports = { createOrder };