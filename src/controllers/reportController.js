const { isValidObjectId } = require("mongoose");
const Report = require("../models/reportModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createReportValidator } = require("../validations/reportValidator");
const BusinessProfile = require("../models/businessProfileSchema");
const Product = require("../models/products");
const Job = require("../models/jobsSchema");
const Community = require("../models/communityModel");

// Create report
const createReport = asyncHandler(async (request, response) => {
    const { userProfileId } = request.user.profiles || {};

    // Get validated payload
    const { reportedContentId, reportedModel, reason, description } = validate(createReportValidator, request.body);

    // Validate ID
    if(!isValidObjectId(reportedContentId)) throw new ApiError(400, "Invalid Mongodb ID");

    // If business
    if(reportedModel === "BusinessProfile")
    {
        const business = await BusinessProfile.findById(reportedContentId).select("_id").lean();
        if(!business) throw new ApiError(404, `${reportedModel} not found! Invalid ${reportedModel} ID`);
    }

    // If product
    if(reportedModel === "Product")
    {
        const product = await Product.findById(reportedContentId).select("_id").lean();
        if(!product) throw new ApiError(404, `${reportedModel} not found! Invalid ${reportedModel} ID`);
    } 
    
    // If job
    if(reportedModel === "Job")
    {
        const job = await Job.findById(reportedContentId).select("_id").lean();
        if(!job) throw new ApiError(404, `${reportedModel} not found! Invalid ${reportedModel} ID`);
    }     
    
    // If community
    if(reportedModel === "Community")
    {
        const community = await Community.findById(reportedContentId).select("_id").lean();
        if(!community) throw new ApiError(404, `${reportedModel} not found! Invalid ${reportedModel} ID`);
    }      

    // Prevent duplication
    const exist = await Report.exists({ userProfileId, reportedContentId });
    if(exist) throw new ApiError(409, `You have already submitted a report for this ${reportedModel}`);   
    
    // Save to db
    const report = await Report.create({ userProfileId, reportedContentId, reportedModel, reason, description });

    // Response
    return response.status(201).json(new ApiResponse(201, null, "Your report has been submitted"));
});

module.exports = { createReport };