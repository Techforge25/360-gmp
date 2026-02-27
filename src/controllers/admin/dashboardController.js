const EscrowTransaction = require("../../models/escrowTrasanction");
const Plan = require("../../models/plan");
const Report = require("../../models/reportModel");
const Subscription = require("../../models/subscription");
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

// Fetch total platform revenue
const fetchTotalPlatformRevenue = asyncHandler(async (request, response) => {
    const dateFilter = getDateFilter(request);

    // Aggregate
    const [result] = await EscrowTransaction.aggregate([
        { $match:{ ...dateFilter } },
        {
            $group:{
                _id:null,
                totalPlatformRevenue:{ $sum:"$platformFee" }
            }
        }
    ]);

    // Extract result
    const totalPlatformRevenue = result?.totalPlatformRevenue || 0;

    // Response
    return response.status(200).json(new ApiResponse(200, totalPlatformRevenue, "Total platform revenue has been fetched"));

});


// Fetch total held amount
const fetchTotalHeldAmount = asyncHandler(async (request, response) => {
    const dateFilter = getDateFilter(request);

    // Search filter
    const searchFilter = { status:"held", ...dateFilter };

    // Aggregate
    const [result] = await EscrowTransaction.aggregate([
        { $match:searchFilter },
        {
            $group:{
                _id:null,
                heldAmount:{ $sum:"$totalAmount" }
            }
        }
    ]);

    // Extract result
    const heldAmount = result?.heldAmount || 0;

    // Response
    return response.status(200).json(new ApiResponse(200, heldAmount, "Total held amount has been fetched"));

});


// Fetch total trial users
const fetchTotalTrialUsers = asyncHandler(async (request, response) => {
    const dateFilter = getDateFilter(request);

    // Find trial plan
    const plan = await Plan.findOne({ name:"TRIAL" }).select("_id name").lean();
    if(!plan) throw new ApiError(404, "No trial plan found");

    // Search filter
    const searchFilter = { planId:plan._id, ...dateFilter };

    // Count trial users
    const totalTrialUsers = await Subscription.countDocuments(searchFilter);

    // Response
    return response.status(200).json(new ApiResponse(200, totalTrialUsers || 0, "Total trial users have been fetched"));

});


// Fetch total reported jobs
const fetchTotalReportedJobs = asyncHandler(async (request, response) => {
    const dateFilter = getDateFilter(request);

    // Search filter
    const searchFilter = { reportedModel:"Job", ...dateFilter };

    // Count reported jobs
    const reportedJobs = await Report.countDocuments(searchFilter);

    // Response
    return response.status(200).json(new ApiResponse(200, reportedJobs || 0, "Total reported jobs have been fetched"));

});

module.exports = { fetchTotalPlatformRevenue, fetchTotalHeldAmount, fetchTotalTrialUsers, fetchTotalReportedJobs };