const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");

const User = require("../../models/users");
const Subscription = require("../../models/subscription");
const Plan = require("../../models/plan");

// Fetch total users, trial users, and paid users
const fetchTotalUsers = asyncHandler(async (request, response) => {
    // Count users
    const totalUsers = await User.countDocuments({});

    // Find trial plan
    const trialPlan = await Plan.findOne({ name:"TRIAL" }).select("_id").lean();
    if(!trialPlan) throw new ApiError(404, "No trial plan found");

    // Get trial users
    const trialUsers = await Subscription.countDocuments({ planId: trialPlan._id });

    // Get paid users
    const paidUsers = await Subscription.countDocuments({ planId: { $ne: trialPlan._id } });

    // Response
    return response.status(200).json(new ApiResponse(200, { totalUsers, trialUsers, paidUsers }, "User stats have been fetched"));

});

module.exports = { fetchTotalUsers };