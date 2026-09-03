const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { emptyList } = require("../../constants");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../../utils/convertToMongoId");
const validate = require("../../utils/validate");
const sendNotification = require("../../utils/sendNotification");

// Allowed date filters
const allowedDateFilters = ["all", "1d", "3d", "7d"];

// Helper function to implement date range
const getDateFilter = (request, fieldName = "createdAt") => {
    // Date filter
    const { dateRange = "all" } = request.query;
    if(!allowedDateFilters.includes(dateRange)) throw new ApiError(400, "Invalid date range");

    // Date filter
    const dateFilter = {};

    if(dateRange !== "all")
    {
        // Calculate date
        const now = new Date();
        let startDate = new Date();

        if(dateRange === "1d") startDate.setDate(now.getDate() - 1);
        if(dateRange === "3d") startDate.setDate(now.getDate() - 3);
        if(dateRange === "7d") startDate.setDate(now.getDate() - 7);

        // Inject date range
        dateFilter[fieldName] = { $gte: startDate };
    }

    return { dateFilter };
};

// Initiator
const jobManagementInitiator = asyncHandler(async (request, response) => {
    // Response
    return response.status(200).json(new ApiResponse(200, { hasAccess: true }, "Initiate Job Management Module"));
});

module.exports = { jobManagementInitiator };