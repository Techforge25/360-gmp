const Report = require("../models/reportModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const reportValidationSchema = require("../validations/reportValidator");

// Create report
const createReport = asyncHandler(async (request, response) => {
    const reporterId = request.user._id;

    // Get payload
    const { reportedModel, reportedContentId, reportedCommentId = null, 
    subject, category, description, evidences = [] } = validate(reportValidationSchema, request.body);

    // Check job existence
    if(reportedModel === "Job") 
    {
        const job = await Job.findById(reportedContentId).lean();
        if(!job) throw new ApiError(404, "Reported Job not found");
    }

    // Check community existence
    if(reportedModel === "Community") 
    {
        const community = await Community.findById(reportedContentId).lean();
        if(!community) throw new ApiError(404, "Reported Community not found");
    }

    // Check community post existence
    if(reportedModel === "CommunityPost") 
    {
        const post = await CommunityPost.findById(reportedContentId).lean();
        if(!post) throw new ApiError(404, "Reported Community Post not found");

        // Comment report
        if(reportedCommentId) 
        {
            const commentExists = post.comments?.some(c => c._id.toString() === reportedCommentId);
            if(!commentExists) throw new ApiError(404, "Reported Comment not found");
        }
    }

    // Duplicate report check
    const duplicateQuery = { reporterId, reportedModel, reportedContentId, reportedCommentId:reportedCommentId || null };
    const existingReport = await Report.findOne(duplicateQuery).lean();
    if(existingReport) return response.status(200).json(new ApiResponse(200, null, "You have already reported this content"));
    

    // Save report
    const report = await Report.create({ reporterId, reportedModel, reportedContentId, reportedCommentId,
    subject, category, description, evidences });
    if(!report) throw new ApiError(500, "Failed to create report");

    // Response
    return response.status(201).json(new ApiResponse(201, report, "Content has been reported"));
});

module.exports = { createReport };