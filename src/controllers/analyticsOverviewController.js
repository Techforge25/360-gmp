const BusinessProfile = require("../models/businessProfileSchema");
const JobApplication = require("../models/jobApplication");
const Job = require("../models/jobsSchema");
const Product = require("../models/products");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const convertToMongoId = require("../utils/convertToMongoId");

// Fetch views over time graph
const fetchViewsOverTime = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);
    const { range = "7d" } = request.query;

    // Decide start date
    const now = new Date();
    let startDate = new Date();

    // Range filter
    if(range === "7d")
    {
        startDate.setDate(now.getDate() - 7);
    }
    else if(range === "1m")
    {
        startDate.setMonth(now.getMonth() - 1);
    }
    else
    {
        throw new ApiError(400, "Invalid range. Use 7d or 1m");
    }

    // Aggregation: unwind views and group by date
    const views = await BusinessProfile.aggregate([
        // Match logged-in user's business profile
        { $match: { ownerUserId:userId } },

        // Break viewedBy array into separate documents
        { $unwind: "$viewedBy" },

        // Filter views within selected range
        { 
            $match: { 
                "viewedBy.viewedAt": { $gte:startDate } 
            } 
        },

        // Group by date (YYYY-MM-DD)
        {
            $group: {
                _id: {
                    $dateToString: { format: "%Y-%m-%d", date: "$viewedBy.viewedAt" }
                },
                views: { $sum: 1 }
            }
        },

        // Sort by date ascending
        { $sort: { _id: 1 } },

        // Projection
        { $project: { _id: 0, date: "$_id", views: 1 } }
    ]);

    // Response
    return response.status(200).json(new ApiResponse(200, views, "Views over time fetched successfully"));
});

// Fetch job application success funnel graph
const fetchJobApplicationFunnel = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);
    const { range = "7d" } = request.query;

    // Decide date
    const now = new Date();
    let startDate = new Date();

    // Range filter
    if(range === "7d") 
    {
        startDate.setDate(now.getDate() - 7);
    } 
    else if(range === "1m") 
    {
        startDate.setMonth(now.getMonth() - 1);
    } 
    else 
    {
        throw new ApiError(400, "Invalid range. Use 7d or 1m");
    }

    // Get business profile
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id");
    if(!business) throw new ApiError(404, "Business profile not found");
    
    // Get jobs posted in selected range
    const jobs = await Job.find({ businessId:business._id, createdAt:{ $gte:startDate } }).select("_id");

    // Get job ids
    const jobIds = jobs.map(job => job?._id);

    if (jobIds.length === 0) 
    {
        const payload = { totalApplications:0, viewed:0, interview:0, hired:0, rejected:0 };
        return response.status(200).json( new ApiResponse(200, payload, "No jobs found in selected range"));
    }

    // Aggregate applications funnel
    const funnel = await JobApplication.aggregate([
        { $match:{ jobId:{ $in:jobIds }, createdAt:{ $gte:startDate } } },
        {
            $group: {
                _id: "$status",
                count: { $sum: 1 }
            }
        }
    ]);

    // Convert aggregation result to object
    const stats = {
        totalApplications: 0,
        viewed: 0,
        interview: 0,
        hired: 0,
        rejected: 0
    };

    funnel.forEach(item => {
        stats.totalApplications += item.count;

        if(item._id === "viewed") stats.viewed = item.count;
        if(item._id === "interview") stats.interview = item.count;
        if(item._id === "hired") stats.hired = item.count;
        if(item._id === "rejected") stats.rejected = item.count;
        if(item._id === "pending") stats.totalApplications += 0; // already counted
    });

    // Response
    return response.status(200).json(new ApiResponse(200, stats, "Job application funnel fetched successfully"));
});

// Fetch top performing products graph
const fetchTopPerformingProducts = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);
    const { range = "7d" } = request.query;

    // Decide date
    const now = new Date();
    let startDate = new Date();

    // Range filter
    if(range === "7d") 
    {
        startDate.setDate(now.getDate() - 7);
    } 
    else if(range === "1m") 
    {
        startDate.setMonth(now.getMonth() - 1);
    } 
    else 
    {
        throw new ApiError(400, "Invalid range. Use 7d or 1m");
    }

    // Get business profile
    const business = await BusinessProfile.findOne({ ownerUserId: userId }).select("_id");
    if(!business) throw new ApiError(404, "Business profile not found");

    // Aggregate products performance
    const topProducts = await Product.aggregate([
        { $match: { businessId: business._id } },

        // Lookup orders for each product
        {
            $lookup: {
                from: "orders",
                localField: "_id",
                foreignField: "items.productId",
                as: "orders"
            }
        },

        // Filter orders in date range + successful statuses
        {
            $addFields: {
                purchaseCount: {
                    $size: {
                        $filter: {
                            input: "$orders",
                            as: "order",
                            cond: {
                                $and: [
                                    { $gte: ["$$order.createdAt", startDate] },
                                    { $in: ["$$order.status", ["paid", "processing", "shipped", "delivered", "completed"]] }
                                ]
                            }
                        }
                    }
                },
                viewsCount: { $ifNull: ["$viewsCount", 0] } // Ensure viewsCount exists
            }
        },

        // Performance score = views + purchases
        {
            $addFields: {
                score: { $add: ["$viewsCount", "$purchaseCount"] }
            }
        },

        // Sort by score
        { $sort: { score: -1 } },

        // Top 5 only
        { $limit: 5 },

        // Final projection for graph
        {
            $project: { _id:0, productId:"$_id", title:1, views:"$viewsCount", purchases:"$purchaseCount", score:1 }
        }
    ]);

    // Response
    return response.status(200).json(new ApiResponse(200, topProducts, "Top performing products fetched successfully"));
});

module.exports = { fetchViewsOverTime, fetchJobApplicationFunnel, fetchTopPerformingProducts };