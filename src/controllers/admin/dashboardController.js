const Subscription = require("../../models/subscription");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// Initiator
const dashboardInitiator = asyncHandler(async (request, response) => {
    // Response
    return response.status(200).json(new ApiResponse(200, { hasAccess: true }, "Initiate Dashboard Module"));
});

// Fetch dashboard stats
const fetchDashboardStats = asyncHandler(async (request, response) => {
    // Response
    return response.status(200).json(new ApiResponse(200, null, "Dashboard stats have been fetched"));
});

// Fetch total platform revenue
// const fetchTotalPlatformRevenue = asyncHandler(async (request, response) => {
//     const dateFilter = getDateFilter(request);

//     // Aggregate
//     const [result] = await EscrowTransaction.aggregate([
//         { $match:{ ...dateFilter } },
//         {
//             $group:{
//                 _id:null,
//                 totalPlatformRevenue:{ $sum: "$platformFee" }
//             }
//         }
//     ]);

//     // Extract result
//     const totalPlatformRevenue = Number(result?.totalPlatformRevenue?.toFixed(2)) || 0;

//     // Response
//     return response.status(200).json(new ApiResponse(200, totalPlatformRevenue, "Total platform revenue has been fetched"));

// });

module.exports = { dashboardInitiator, fetchDashboardStats };