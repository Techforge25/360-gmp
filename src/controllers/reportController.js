const { isValidObjectId } = require("mongoose");
const Report = require("../models/reportModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createReportValidator } = require("../validations/reportValidator");
const BusinessProfile = require("../models/businessProfileSchema");
const { reportBusiness } = require("../service/reportService");

// Create report
const createReport = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Get validated payload
    const { reportedContentId, reportedModel, reason, description } = validate(createReportValidator, request.body);

    // Validate
    if(!isValidObjectId(reportedContentId)) throw new ApiError(400, "Invalid Mongodb ID");

    if(reportedModel === "BusinessProfile")
    {
        const report = await reportBusiness(reportedContentId, reason, description);
        if(!report) throw new ApiError(400, "Failed to report a business");
    }

    // Response
    return response.status(201).json(new ApiResponse(201, null, "Your report has been submitted"));
});

module.exports = { createReport };