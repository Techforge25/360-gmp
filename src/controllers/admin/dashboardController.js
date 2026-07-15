const BusinessProfile = require("../../models/businessProfileSchema");
const EscrowTransaction = require("../../models/escrowTrasanction");
const Plan = require("../../models/plan");
const Report = require("../../models/reportModel");
const Subscription = require("../../models/subscription");
const UserProfile = require("../../models/userProfile");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// Allowed date filters
const allowedDateFilters = ["all", "7d", "1m"];

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

        // Inject date range
        searchFilter.createdAt = { $gte:startDate };
    }

    return searchFilter;
};

// Fetch dashboard stats
const fetchDashboardStats = asyncHandler(async (request, response) => {
    const dateFilter = getDateFilter(request);

    // Promise aggregation
    const [[totalPlatformRevenue], [heldAmount], totalUserProfiles, totalBusinessProfiles] = await Promise.all([
        // Total platform revenue
        EscrowTransaction.aggregate([
            { $match:{ ...dateFilter } },
            {
                $group:{
                    _id: null,
                    result: { $sum: "$platformFee" }
                }
            }
        ]),

        // Held amount
        EscrowTransaction.aggregate([
            { $match: { ...dateFilter, status: "held" } },
            {
                $group:{
                    _id:null,
                    result:{ $sum:"$totalAmount" }
                }
            }
        ]),

        // Total user profiles
        UserProfile.countDocuments({}),

        // Total user profiles
        BusinessProfile.countDocuments({}),        
    ]);

    // Payload
    const payload = { 
        totalPlatformRevenue: Number(totalPlatformRevenue?.result?.toFixed(2)) || 0,
        heldAmount: Number(heldAmount?.result?.toFixed(2)) || 0,
        totalUserProfiles: Number(totalUserProfiles) || 0,
        totalBusinessProfiles: Number(totalBusinessProfiles) || 0
    };
    
    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Dashboard stats have been fetched"));
});

module.exports = { fetchDashboardStats };