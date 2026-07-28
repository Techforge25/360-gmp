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
    const { dateFilter = "all" } = request.query;
    if(!allowedDateFilters.includes(dateFilter)) throw new ApiError(400, "Invalid date filter");

    // Search filter
    const searchFilter = {};

    if(dateFilter !== "all")
    {
        // Calculate date
        const now = new Date();
        let startDate = new Date();
        
        if(dateFilter === "7d") startDate.setDate(now.getDate() - 7);
        if(dateFilter === "1m") startDate.setMonth(now.getMonth() - 1);
        if(dateFilter === "6m") startDate.setMonth(now.getMonth() - 6);
        if(dateFilter === "1y") startDate.setMonth(now.getMonth() - 12);

        // Inject date range
        searchFilter.createdAt = { $gte: startDate };
    }

    return { searchFilter };
};

// Fetch account stats
const fetchAccountStats = asyncHandler(async (request, response) => {
    // Get date filter
    const { searchFilter } = getDateFilter(request);

    // Fetch
    const [totalParentUsers, totalUserProfiles, totalBusinessProfiles, pendingBusinessProfiles] = await Promise.all([
        User.countDocuments({ ...searchFilter, status: "active" }),
        UserProfile.countDocuments({ ...searchFilter }),
        BusinessProfile.countDocuments({ ...searchFilter, status: "active" }),
        BusinessProfile.countDocuments({ ...searchFilter, status: "pending" })
    ]);

    // Payload
    const payload = { totalParentUsers, totalUserProfiles, totalBusinessProfiles, pendingBusinessProfiles };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Account stats have been fetched"));
});

module.exports = { fetchAccountStats };