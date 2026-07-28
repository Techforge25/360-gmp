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
    const userId = request.user._id;
    const { userProfileId } = request.user.profiles || {};

    // Get validated payload
    const { reportedContentId, reportedModel, reason, media, description } = validate(createReportValidator, request.body);

    // Validate ID
    if(!isValidObjectId(reportedContentId)) throw new ApiError(400, "Invalid Mongodb ID");

    // If business
    if(reportedModel === "BusinessProfile")
    {
        const business = await BusinessProfile.findById(reportedContentId).select("_id ownerUserId").lean();
        if(!business) throw new ApiError(404, `${reportedModel} not found! Invalid ${reportedModel} ID`);
        if(String(business.ownerUserId) === String(userId)) throw new ApiError(403, "You cannot report your own business");
    }

    // If product
    if(reportedModel === "Product")
    {
        const product = await Product.findById(reportedContentId)
        .populate({ path: "businessId", select: "ownerUserId" }).select("_id businessId").lean();
        if(!product) throw new ApiError(404, `${reportedModel} not found! Invalid ${reportedModel} ID`);
        if(String(product.businessId.ownerUserId) === String(userId)) throw new ApiError(403, "You cannot report your own product");
    } 
    
    // If job
    if(reportedModel === "Job")
    {
        const job = await Job.findById(reportedContentId)
        .populate({ path: "businessId", select: "ownerUserId" }).select("_id businessId").lean();
        if(!job) throw new ApiError(404, `${reportedModel} not found! Invalid ${reportedModel} ID`);
        if(String(job.businessId.ownerUserId) === String(userId)) throw new ApiError(403, "You cannot report your own job");
    }     
    
    // If community
    if(reportedModel === "Community")
    {
        const community = await Community.findById(reportedContentId)
        .populate({ path: "businessId", select: "ownerUserId" }).select("_id businessId").lean();
        if(!community) throw new ApiError(404, `${reportedModel} not found! Invalid ${reportedModel} ID`);
        if(String(community.businessId.ownerUserId) === String(userId)) throw new ApiError(403, "You cannot report your own community");
    }

    // Prevent duplication
    const exist = await Report.exists({ userProfileId, reportedContentId });
    if(exist) throw new ApiError(409, `You have already submitted a report for this ${reportedModel}`);   
    
    // Save to db
    const report = await Report.create({ userProfileId, reportedContentId, reportedModel, reason, media, description });

    // Response
    return response.status(201).json(new ApiResponse(201, null, "Your report has been submitted"));
});

module.exports = { createReport };