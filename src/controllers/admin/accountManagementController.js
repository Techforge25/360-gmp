const { emptyList } = require("../../constants");
const BusinessProfile = require("../../models/businessProfileSchema");
const UserProfile = require("../../models/userProfile");
const User = require("../../models/users");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// Allowed date filters
const allowedDateFilters = ["all", "7d", "1m", "6m", "1y"];

// Helper function to implement date range
const getDateFilter = (request) => {
    // Date filter
    const { dateRange = "all" } = request.query;
    if(!allowedDateFilters.includes(dateRange)) throw new ApiError(400, "Invalid date filter");

    // Date filter
    const dateFilter = {};

    if(dateRange !== "all")
    {
        // Calculate date
        const now = new Date();
        let startDate = new Date();

        if(dateRange === "7d") startDate.setDate(now.getDate() - 7);
        if(dateRange === "1m") startDate.setMonth(now.getMonth() - 1);
        if(dateRange === "6m") startDate.setMonth(now.getMonth() - 6);
        if(dateRange === "1y") startDate.setMonth(now.getMonth() - 12);

        // Inject date range
        dateFilter.createdAt = { $gte: startDate };
    }

    return { dateFilter };
};

// Fetch account stats
const fetchAccountStats = asyncHandler(async (request, response) => {
    // Get date filter
    const { dateFilter } = getDateFilter(request);

    // Fetch
    const [totalParentUsers, totalUserProfiles, totalBusinessProfiles, pendingBusinessProfiles] = await Promise.all([
        User.countDocuments({ ...dateFilter, status: "active" }),
        UserProfile.countDocuments({ ...dateFilter }),
        BusinessProfile.countDocuments({ ...dateFilter, status: "active" }),
        BusinessProfile.countDocuments({ ...dateFilter, status: "pending" })
    ]);

    // Payload
    const payload = { totalParentUsers, totalUserProfiles, totalBusinessProfiles, pendingBusinessProfiles };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Account stats have been fetched"));
});

// Fetch user profiles
const fetchUserProfiles = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search, type } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(request);    

    // Filters
    const baseFilter = {};
    const planFilter = {};

    if(search) baseFilter.fullName = { $regex: search, $options: "i" }; // Filter by user profile name
    if(type) planFilter.name = { $regex: type, $options: "i" }; // Filter by plan type

    // Fetch
    const userProfiles = await UserProfile.aggregatePaginate([
        // Match
        { $match: { ...dateFilter, ...baseFilter } },

        // Sort
        { $sort: { createdAt: -1 } },

        // Lookup subscription
        {
            $lookup: {
                from: "subscriptions",
                localField: "userId",
                foreignField: "userId",
                as: "subscription",
                pipeline: [
                    {
                        $lookup: {
                            from: "plans",
                            localField: "planId",
                            foreignField: "_id",
                            as: "plan",
                            pipeline:[{ $match: planFilter }]
                        }
                    },

                    // Unwind
                    { $unwind: "$plan" },   
                    
                    // Project 
                    { $project: { _id:0, subscriptionType: "$plan.name" } }
                ]
            }
        },

        // Unwind
        { $unwind: "$subscription" },

        // Projection
        {
            $project: {
                fullName: 1,
                email: 1, 
                logo: 1,
                createdAt: 1,
                subscription: 1
            }
        }
    ], { page, limit });
    if(!userProfiles.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No user profiles found"));

    // Response
    return response.status(200).json(new ApiResponse(200, userProfiles, "User profiles have been fetched"));
});

module.exports = { fetchAccountStats, fetchUserProfiles };