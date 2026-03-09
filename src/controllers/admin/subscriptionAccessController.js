const Subscription = require("../../models/subscription");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// Fetch subscription stats
const fetchSubscriptionStats = asyncHandler(async (request, response) => {
    const subscriptions = await Subscription.aggregate([
        { $match:{} },

        // Lookup
        {
            $lookup:{
                from:"plans",
                localField:"planId",
                foreignField:"_id",
                as:"plan",
                pipeline:[
                    { $project:{ _id:0, name:1 } },
                ]
            }
        },

        // Unwind
        { $unwind: { path:"$plan", preserveNullAndEmptyArrays:true } },

        // Projection
        { $project:{ plan:"$plan.name" } }
    ]);

    // Response
    return response.status(200).json(new ApiResponse(200, subscriptions, "Subscription stats have been fetched"));
});

module.exports = { fetchSubscriptionStats };