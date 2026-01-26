const BusinessProfile = require("../models/businessProfileSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Fetch views over time
const fetchViewsOverTime = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { range = "7d" } = request.query;

    // Decide start date
    const now = new Date();
    let startDate = new Date();

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

module.exports = { fetchViewsOverTime };