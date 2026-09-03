const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { emptyList } = require("../../constants");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../../utils/convertToMongoId");
const validate = require("../../utils/validate");
const sendNotification = require("../../utils/sendNotification");
const Job = require("../../models/jobsSchema");
const Report = require("../../models/reportModel");
const getDateFilter = require("../../utils/dateFilter");

// Allowed date filters
const allowedDateFilters = ["all", "1d", "3d", "7d"];

// Initiator
const jobManagementInitiator = asyncHandler(async (request, response) => {
    // Response
    return response.status(200).json(new ApiResponse(200, { hasAccess: true }, "Initiate Job Management Module"));
});

// Fetch stats
const fetchJobStats = asyncHandler(async (request, response) => {
    // Get date filter
    const { dateFilter } = getDateFilter(request);

    // Fetch
    const [totalActiveJobs, totalReportedJobs] = await Promise.all([
        Job.countDocuments({ status: "open", ...dateFilter }),
        Report.countDocuments({ reportedModel: "Job", ...dateFilter })
    ]);

    // Payload
    const payload = { totalActiveJobs, totalReportedJobs };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Job stats have been fetched"));
});

module.exports = { jobManagementInitiator, fetchJobStats };