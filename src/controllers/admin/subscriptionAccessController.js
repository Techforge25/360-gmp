const { emptyList } = require("../../constants");
const Subscription = require("../../models/subscription");
const User = require("../../models/users");
const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../../utils/convertToMongoId");

// Allowed date filters
const allowedDateFilters = ["all", "7d", "1m", "6m", "1y"];

// Helper function to implement date range
const getDateFilter = (request, fieldName = "createdAt") => {
    // Date filter
    const { dateRange = "all" } = request.query;
    if(!allowedDateFilters.includes(dateRange)) throw new ApiError(400, "Invalid date range");

    // Date filter
    const dateFilter = {};

    if(dateRange !== "all")
    {
        // Calculate date
        const now = new Date();
        let startDate = new Date();

        if(dateRange === "7d") startDate.setDate(now.getDate() - 7);
        if(dateRange === "1m") startDate.setMonth(now.getMonth() - 1);
        if(dateRange === "6m") startDate.setMonth(now.getMonth() - 6);
        if(dateRange === "1y") startDate.setMonth(now.getMonth() - 12);

        // Inject date range
        dateFilter[fieldName] = { $gte: startDate };
    }

    return { dateFilter };
};

// Fetch subscription stats
// const fetchSubscriptionStats = asyncHandler(async (request, response) => {
//     const subscriptions = await Subscription.aggregate([
//         // Lookup
//         {
//             $lookup:{
//                 from:"plans",
//                 localField:"planId",
//                 foreignField:"_id",
//                 as:"plan",
//                 pipeline:[
//                     { $project:{ _id:0, name:1 } },
//                 ]
//             }
//         },

//         // Unwind
//         { $unwind: { path:"$plan", preserveNullAndEmptyArrays:true } },

//         // Group
//         {
//             $group:{
//                 _id:"$plan.name",
//                 count:{ $sum:1 }
//             }
//         },
//     ]);

//     // Response
//     return response.status(200).json(new ApiResponse(200, subscriptions, "Subscription stats have been fetched"));
// });

// Fetch subscription stats (V2)
const fetchSubscriptionStats = asyncHandler(async (request, response) => {
    // Get date filter
    const { dateFilter } = getDateFilter(request, "startDate");

    const [[paidMembers], [trialMembers], [trialConversion]] = await Promise.all([
        // Paid members
        Subscription.aggregate([
            // Match
            { $match: { ...dateFilter, status: "active" } },

            // Lookup plan
            {
                $lookup: {
                    from: "plans",
                    localField: "planId",
                    foreignField: "_id",
                    as: "plan"
                }
            },

            // Unwind
            { $unwind: "$plan" },
            { $match: { "plan.name": { $ne: "Sneak Peek Free – 14 Days" } } },

            // Count
            {
                $group: {
                    _id: null,
                    totalPaidMembers: { $sum: 1 }
                }
            }
        ]),

        // Trial members
        Subscription.aggregate([
            // Match
            { $match: { ...dateFilter, status: "active" } },

            // Lookup plan
            {
                $lookup: {
                    from: "plans",
                    localField: "planId",
                    foreignField: "_id",
                    as: "plan"
                }
            },

            // Unwind
            { $unwind: "$plan" },
            { $match: { "plan.name": { $eq: "Sneak Peek Free – 14 Days" } } },

            // Count
            {
                $group: {
                    _id: null,
                    totalTrialMembers: { $sum: 1 }
                }
            }
        ]),   
        
        // Trial conversion
        Subscription.aggregate([
            // Sort subscriptions chronologically
            { $sort: { startDate: 1 } },

            // Lookup plan
            {
                $lookup: {
                    from: "plans",
                    localField: "planId",
                    foreignField: "_id",
                    as: "plan"
                }
            },

            // Unwind
            { $unwind: "$plan" },

            // Apply date filter
            { $match: dateFilter },

            // Group subscriptions by user
            {
                $group: {
                    _id: "$userId",
                    subscriptions: {
                        $push: {
                            planName: "$plan.name",
                            price: "$plan.price",
                            startDate: "$startDate"
                        }
                    }
                }
            },

            // Determine if user converted
            {
                $project: {
                    hadTrial: {
                        $eq: [{ $arrayElemAt: ["$subscriptions.planName", 0] }, "Sneak Peek Free – 14 Days"]
                    },

                    converted: {
                        $and: [
                            {
                                $eq: [{ $arrayElemAt: ["$subscriptions.planName", 0] }, "Sneak Peek Free – 14 Days"]
                            },
                            {
                                $gt: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: "$subscriptions",
                                                as: "subscription",
                                                cond: { $gt: ["$$subscription.price", 0] }
                                            }
                                        }
                                    },
                                    0
                                ]
                            }
                        ]
                    }
                }
            },

            // Final counts
            {
                $group: {
                    _id: null,
                    totalTrials: {
                        $sum: { $cond: ["$hadTrial", 1, 0] }
                    },
                    totalConverted: {
                        $sum: { $cond: ["$converted", 1, 0] }
                    }
                }
            }
        ])        
    ]);

    // Calculate total trial conversion
    const totalTrials = trialConversion?.totalTrials || 0;
    const totalConverted = trialConversion?.totalConverted || 0;
    const trialConversionPercentage = totalTrials === 0 ? 0 : Number(((totalConverted / totalTrials) * 100).toFixed(2));

    // Payload
    const payload = {
        totalPaidMembers: Number(paidMembers?.totalPaidMembers) || 0,
        totalTrialMembers: Number(trialMembers?.totalTrialMembers) || 0,
        trialConversionPercentage
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Subscription stats have been fetched"));
});

// Fetch trial users
const fetchTrialUsers = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search, subscriptionStatus = "all" } = request.query;

    // Pagination options
    const options = {
        page: Number(page),
        limit: Number(limit),
    };

    // Get date filter
    const { dateFilter } = getDateFilter(request, "startDate");

    // Search filter (Search by user profile full name)
    const searchFilter = {};
    if(search) searchFilter.fullName = { $regex: search, $options: "i" };

    // Subscription type filter
    const subscriptionStatusFilter = {};
    if(subscriptionStatus && !["all", "active", "expired"].includes(subscriptionStatus))
    {
        throw new ApiError(400, "Invalid subscription status filter");
    }

    if(subscriptionStatus && subscriptionStatus !== "all")
    {
        subscriptionStatusFilter.status = subscriptionStatus;
    }

    // Calculate days
    const today = new Date();

    // Fetch
    const trialUsers = await User.aggregatePaginate([
        // Sort
        { $sort: { createdAt:-1 } },
        
        // Lookup on user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "_id",
                foreignField: "userId",
                as: "userProfile",
                pipeline: [
                    { $match: searchFilter },
                    { $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }
                ]
            }
        },
        { $unwind: "$userProfile" },        

        // Lookup on subscription
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "userId",
                as: "subscription",
                pipeline: [
                    { $match: { ...dateFilter, ...subscriptionStatusFilter } }
                ]
            }
        },
        { $unwind: "$subscription" },

        // Lookup on plan
        {
            $lookup: {
                from: "plans",
                localField: "subscription.planId",
                foreignField: "_id",
                as: "plan"
            }
        },
        { $unwind: "$plan" },

        // Trial plan filter
        { $match: { "plan.price": 0 } },

        // Lookup trial usage
        {
            $lookup: {
                from: "trialusages",
                localField: "_id",
                foreignField: "userId",
                as: "trialUsage"
            }
        },
        { $unwind: { path: "$trialUsage", preserveNullAndEmptyArrays: true } },

        // Count days remaining
        {
            $addFields: {
                daysRemaining: {
                    $ceil: {
                        $divide: [
                            { $subtract: ["$subscription.endDate", today] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            }
        },

        // Projection
        {
            $project: {
                userProfile: 1,
                daysRemaining: 1,
                status: "$subscription.status"
            }
        }
    ], options);
    if(!trialUsers.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No trial users found"));

    // Response
    return response.status(200).json(new ApiResponse(200, trialUsers, "Trial users have been fetched"));    
});

// View trial user
const viewTrialUser = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { userId } = request.params;
    if(!isValidObjectId(userId)) throw new ApiError(400, "Invalid User ID");

    // Aggregate
    const [user] = await User.aggregate([
        // Match
        { $match: { _id: convertToMongoId(userId) } },

        // Lookup subscription
        {
            $lookup: {
               from: "subscriptions",
               localField: "_id",
               foreignField: "userId",
               as: "subscription",
               pipeline: [
                    {
                        $lookup: {
                            from: "plans",
                            localField: "planId",
                            foreignField: "_id",
                            as: "plan",
                            pipeline: [{ $project: { _id: 0, name: 1 } }]
                        }
                    },
                    { $unwind: "$plan" },
                    { $project: { _id: 0, startDate: 1, endDate: 1, planName: "$plan.name"  } }
               ] 
            }
        },        

        // Unwind
        { $unwind: "$subscription" },

        // Projection
        { $project: { email: 1, subscription: 1 } }
    ]);
    if(!user) throw new ApiError(404, "User not found");

    // Response
    return response.status(200).json(new ApiResponse(200, user, "Trial user details have been fetched"));
});

// Fetch paid users
const fetchPaidUsers = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search, tierType, subscriptionStatus } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(request, "startDate");

    // Validate query strings
    const allowedTierTypes = ["Consumer / Individual", "Bronze", "Silver", "Gold", "Premium"];
    const allowedSubscriptionStatus = ["active", "expired"];

    if(tierType && !allowedTierTypes.includes(tierType)) throw new ApiError(400, "Invalid tier type");
    if(subscriptionStatus && !allowedSubscriptionStatus.includes(subscriptionStatus))
    {
        throw new ApiError(400, "Invalid subscription status");
    }

    // Fetch
    const paidUsers = await User.aggregatePaginate([
        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "_id",
                foreignField: "userId",
                as: "userProfile",
                pipeline: [
                    { $project: { _id: 0, fullName: 1, logo: 1 } }
                ]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "_id",
                foreignField: "ownerUserId",
                as: "businessProfile",
                pipeline: [
                    { $project: { _id: 0, companyName: 1 } }
                ]
            }
        },

        // Lookup inside subscription
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "userId",
                as:"subscription",
                pipeline: [
                    { $match: dateFilter },
                    { $project:{ _id: 0, planId: 1, status: 1, startDate: 1 } },

                    // Lookup inside plans
                    {
                        $lookup:{
                            from: "plans",
                            localField: "planId",
                            foreignField: "_id",
                            as: "plan",
                            pipeline:[
                                { $project:{ _id: 0, name: 1, price: 1 } }
                            ]
                        }
                    }
                ]
            },
        },

        // Unwind
        { $unwind: "$userProfile" },
        { $unwind: "$businessProfile" },
        { $unwind: "$subscription" },
        { $unwind: "$subscription.plan" },

        // Search
        ...(search ? [{
            $match: {
                $or: [
                    { "userProfile.fullName": { $regex: search, $options: "i" } },
                    { "businessProfile.companyName": { $regex: search, $options: "i" } }
                ]
            }
        }] : []),

        // Filter by tier type
        ...(tierType ? [{ $match: { "subscription.plan.name": tierType } }] : []),

        // Filter by subscription status (active | expired)
        ...(subscriptionStatus ? [{ $match: { "subscription.status": subscriptionStatus } }] : []),

        // Match paid plan
        { $match: { "subscription.plan.price": { $gt: 0 } } },

        // Sort
        { $sort:{ createdAt: -1 } },

        // Final projection
        {
            $project: {
                fullName: "$userProfile.fullName",
                logo: "$userProfile.logo",
                companyName: "$businessProfile.companyName",
                subscriptionTier: "$subscription.plan.name",
                joinDate: "$createdAt",
                status: "$subscription.status"
            }
        }
    ], { page, limit });
    if(!paidUsers.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No paid users found"));

    // Response
    return response.status(200).json(new ApiResponse(200, paidUsers, "Paid users have been fetched"));
});

// View


// Fetch subscriptions expiring soon users
const fetchExpiringSubscriptions = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search = "", days = 7 } = request.query;

    // Pagination options
    const options = {
        page: Number(page),
        limit: Number(limit),
    };

    // Base filter
    const baseFilter = {};
    if(search) baseFilter.email = { $regex: search, $options:"i" };    

    // Calculate date threshold
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + Number(days) * 24 * 60 * 60 * 1000);

    // Fetch
    const aggregate = User.aggregate([
        // Match
        { $match: baseFilter },

        // Sort
        { $sort:{ createdAt:-1 } },        

        // Lookup inside subscription
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "userId",
                as: "subscription",
                pipeline: [
                    // Match subscriptions ending within threshold
                    { $match: { endDate: { $lte: thresholdDate } } },

                    { $project: { _id:0, planId:1, endDate:1, startDate:1 } },

                    // Lookup inside plans
                    {
                        $lookup: {
                            from: "plans",
                            localField: "planId",
                            foreignField: "_id",
                            as: "plan",
                            pipeline: [
                                { $project: { _id:0, name:1 } }
                            ]
                        }
                    }
                ]
            }
        },

        // Unwind
        { $unwind: "$subscription" },
        { $unwind: "$subscription.plan" },

        // Final projection
        {
            $project: {
                email:1,
                subscriptionTier: "$subscription.plan.name",
                subscriptionStatus: "$subscription.status",
                timeRemaining: {
                    $ceil: {
                        $divide: [
                            { $subtract: ["$subscription.endDate", now] },
                            1000 * 60 * 60 * 24
                        ]
                    }
                }
            }
        },

        // Sort by soonest to expire
        { $sort: { "timeRemaining": 1 } }
    ]);

    // Execute query
    const expiringSubscriptions = await User.aggregatePaginate(aggregate, options);
    if(!expiringSubscriptions.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No expiring subscriptions found"));

    // Response
    return response.status(200).json(new ApiResponse(200, expiringSubscriptions, "Expiring subscriptions have been fetched"));
});

module.exports = { fetchSubscriptionStats, fetchTrialUsers, fetchPaidUsers, viewTrialUser, 
fetchExpiringSubscriptions };