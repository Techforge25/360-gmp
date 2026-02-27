const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const User = require("../../models/users");
const Subscription = require("../../models/subscription");
const Plan = require("../../models/plan");

// Fetch total users, trial users, and paid users count
const fetchUsersStats = asyncHandler(async (request, response) => {
    const [totalUsers, pendingUsers, flaggedUsers, trialPlan] = await Promise.all([
        // Count total, pending and flagged users
        User.countDocuments({}),
        User.countDocuments({ status:"pending" }),
        User.countDocuments({ status:"flagged" }),

        // Find trial plan
        Plan.findOne({ name:"TRIAL" }).select("_id").lean()
    ]);
    if(!trialPlan) throw new ApiError(404, "No trial plan found");

    // Get trial users
    const trialUsers = await Subscription.countDocuments({ planId: trialPlan._id });

    // Get paid users
    const paidUsers = await Subscription.countDocuments({ planId: { $ne: trialPlan._id } });

    // Prepare payload
    const payload = { totalUsers, trialUsers, paidUsers, pendingUsers, flaggedUsers  };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "User stats have been fetched"));
});

module.exports = { fetchUsersStats };