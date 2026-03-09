const Subscription = require("../../models/subscription");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// Fetch subscription stats
const fetchSubscriptionStats = asyncHandler(async (request, response) => {
    const subscriptions = await Subscription.aggregate([
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

        // Group
        {
            $group:{
                _id:"$plan.name",
                count:{ $sum:1 }
            }
        },
    ]);

    // Response
    return response.status(200).json(new ApiResponse(200, subscriptions, "Subscription stats have been fetched"));
});

module.exports = { fetchSubscriptionStats };