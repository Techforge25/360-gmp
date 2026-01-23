const Community = require("../models/communityModel");
const CommunityPost = require("../models/communityPostModel");
const Job = require("../models/jobsSchema");
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

// Fetch job report
const fetchJobReports = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Aggregate
    const aggregate = Report.aggregate([
        { $match:{ reportedModel:"Job" } },

        // Lookup to get reporter details
        {
            $lookup:{
                from:"users",
                localField:"reporterId",
                foreignField:"_id",
                as:"reporter",
                pipeline:[
                    { $project:{ email:1 } }
                ]
            }
        },

        // Look up to get content details
        {
            $lookup:{
                from:"jobs",
                localField:"reportedContentId",
                foreignField:"_id",
                as:"reportedContent",
                pipeline:[
                    { $project:{ businessId:0, updatedAt:0, __v:0 } }
                ]
            }
        },        

        { $unwind:"$reporter" },
        { $unwind:"$reportedContent" },

        // Porjection
        { $project:{ reporterId:0, reportedModel:0, reportedContentId:0, reportedCommentId:0, __v:0  } }
    ]);

    // Execute query
    const reports = await Report.aggregatePaginate(aggregate, { page, limit });
    if(!reports.docs.length) return response.status(200).json(new ApiResponse(200, reports, "No reported job available"));

    // Response
    return response.status(200).json(new ApiResponse(200, reports, `Reported Jobs have been fetched`));
});

// Fetch community reports
const fetchCommunityReports = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Aggregate
    const aggregate = Report.aggregate([
        { $match:{ reportedModel:"Community" } },

        // Lookup to get reporter details
        {
            $lookup:{
                from:"users",
                localField:"reporterId",
                foreignField:"_id",
                as:"reporter",
                pipeline:[
                    { $project:{ email:1 } }
                ]
            }
        },

        // Look up to get content details
        {
            $lookup:{
                from:"communities",
                localField:"reportedContentId",
                foreignField:"_id",
                as:"reportedContent",
                pipeline:[
                    { $project:{ businessId:0, updatedAt:0, __v:0 } }
                ]
            }
        },        

        { $unwind:"$reporter" },
        { $unwind:"$reportedContent" },

        // Porjection
        { $project:{ reporterId:0, reportedModel:0, reportedContentId:0, reportedCommentId:0, __v:0  } }
    ]);

    // Execute query
    const reports = await Report.aggregatePaginate(aggregate, { page, limit });
    if(!reports.docs.length) return response.status(200).json(new ApiResponse(200, reports, "No reported community available"));

    // Response
    return response.status(200).json(new ApiResponse(200, reports, `Reported community have been fetched`));
});

// Fetch community post reports
const fetchCommunityPostReports = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Aggregate
    const aggregate = Report.aggregate([
        { $match:{ reportedModel:"CommunityPost" } },

        // Lookup to get reporter details
        {
            $lookup:{
                from:"users",
                localField:"reporterId",
                foreignField:"_id",
                as:"reporter",
                pipeline:[
                    { $project:{ email:1 } }
                ]
            }
        },

        // Look up to get content details
        {
            $lookup:{
                from:"communityposts",
                localField:"reportedContentId",
                foreignField:"_id",
                as:"reportedContent",
                pipeline:[
                    { $project:{ businessId:0, updatedAt:0, __v:0 } }
                ]
            }
        },        

        { $unwind:"$reporter" },
        { $unwind:"$reportedContent" },

        // Porjection
        { $project:{ reporterId:0, reportedModel:0, reportedContentId:0, reportedCommentId:0, __v:0  } }
    ]);

    // Execute query
    const reports = await Report.aggregatePaginate(aggregate, { page, limit });
    if(!reports.docs.length) return response.status(200).json(new ApiResponse(200, reports, "No reported community post available"));

    // Response
    return response.status(200).json(new ApiResponse(200, reports, `Reported community posts have been fetched`));
});

// Fetch community post comment reports
const fetchCommunityPostCommentReports = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Aggregate
    const aggregate = Report.aggregate([
        // Only comment reports
        { 
            $match: { 
                reportedModel: "CommunityPost",
                reportedCommentId: { $ne: null }
            } 
        },

        // Lookup reporter
        {
            $lookup: {
                from: "users",
                localField: "reporterId",
                foreignField: "_id",
                as: "reporter",
                pipeline: [
                    { $project: { email: 1 } }
                ]
            }
        },

        // Lookup post
        {
            $lookup: {
                from: "communityposts",
                localField: "reportedContentId",
                foreignField: "_id",
                as: "post"
            }
        },

        // Unwind
        { $unwind: "$reporter" },
        { $unwind: "$post" },
        { $unwind: "$post.comments" },

        // Match reported comment
        {
            $match: {
                $expr: {
                    $eq: ["$post.comments._id", "$reportedCommentId"]
                }
            }
        },

        // Projection
        { $project: { subject: 1, category: 1, description: 1, evidences: 1, status: 1, createdAt: 1,
            reporter: 1,
            post: { _id: 1, content: 1, communityId: 1,
                    comments: {
                        _id: "$post.comments._id",
                        userId: "$post.comments.userId",
                        onModel: "$post.comments.onModel",
                        reportedComment: "$post.comments.content",
                        commentedAt: "$post.comments.commentedAt"
                    }
                }
            }
        }
    ]);

    // Execute query
    const reports = await Report.aggregatePaginate(aggregate, { page, limit });
    if (!reports.docs.length) return response.status(200).json(new ApiResponse(200, reports, "No reported comments available"));

    // Response
    return response.status(200).json(new ApiResponse(200, reports, "Reported comments have been fetched"));
});

module.exports = { createReport, fetchJobReports, fetchCommunityReports, fetchCommunityPostReports, fetchCommunityPostCommentReports };