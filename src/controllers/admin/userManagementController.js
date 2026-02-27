const asyncHandler = require("../../utils/asyncHandler");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const User = require("../../models/users");
const Subscription = require("../../models/subscription");
const Plan = require("../../models/plan");
const { emptyList } = require("../../constants");

// Fetch users stats
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

// Fetch total user
const fetchTotalUsers = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search = "" } = request.query;

    // Search filter
    const filter = {};
    if(search) filter.email = { $regex:search, $options:"i" };

    // Aggregation
    const aggregate = User.aggregate([
        // Match
        { $match: filter },

        // Sort
        { $sort:{ createdAt:-1 } },

        // Projection
        { $project:{ email:1, status:1, createdAt:1 } }
    ]);

    // Execute query
    const users = await User.aggregatePaginate(aggregate, { page, limit });
    if(!users.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No users found"));

    // Response
    return response.status(200).json(new ApiResponse(200, users, "All users have been fetched"));
});

// Fetch pending user
const fetchPendingUsers = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search = "" } = request.query;

    // Search filter
    const filter = { status:"pending" };
    if(search) filter.email = { $regex:search, $options:"i" };

    // Aggregation
    const aggregate = User.aggregate([
        // Match
        { $match: filter },

        // Sort
        { $sort:{ createdAt:-1 } },

        // Projection
        { $project:{ email:1, status:1, createdAt:1 } }
    ]);

    // Execute query
    const users = await User.aggregatePaginate(aggregate, { page, limit });
    if(!users.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No pending users found"));

    // Response
    return response.status(200).json(new ApiResponse(200, users, "Pending users have been fetched"));
});

module.exports = { fetchUsersStats, fetchTotalUsers, fetchPendingUsers };