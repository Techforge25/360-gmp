const { emptyList } = require("../../constants");
const Subscription = require("../../models/subscription");
const User = require("../../models/users");
const ApiResponse = require("../../utils/ApiResponse");
const ApiError = require("../../utils/ApiError");
const asyncHandler = require("../../utils/asyncHandler");
const { isValidObjectId } = require("mongoose");
const convertToMongoId = require("../../utils/convertToMongoId");
const SubscriptionHistory = require("../../models/subscriptionHistoryModel");

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
const fetchSubscriptionStats = asyncHandler(async (request, response) => {
    // Get date filter
    const { dateFilter } = getDateFilter(request, "startDate");
    const { dateFilter: trialConversionDateFilter } = getDateFilter(request);

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
            { $match: { "plan.price": { $gt: 0 } } },

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
        SubscriptionHistory.aggregate([
            // Match
            { $match: { ...trialConversionDateFilter, status: "paid" } },

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

            // Group by user
            {
                $group: {
                    _id: "$userId",
                    plans: {
                        $push: {
                            name: "$plan.name",
                            price: "$plan.price"
                        }
                    }
                }
            },

            // Calculate conversion
            {
                $project: {
                    hadTrial: { $in: ["Sneak Peek Free – 14 Days", "$plans.name"] },

                    converted: {
                        $and: [
                            { $in: ["Sneak Peek Free – 14 Days", "$plans.name"] },
                            {
                                $gt: [
                                    {
                                        $size: {
                                            $filter: {
                                                input: "$plans",
                                                as: "plan",
                                                cond: { $gt: ["$$plan.price", 0] }
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

            // Count
            {
                $group: {
                    _id: null,
                    totalTrials: { $sum: { $cond: ["$hadTrial", 1, 0] } },
                    totalConverted: { $sum: { $cond: ["$converted", 1, 0] } }
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

    // Search filter (Search by parent user's email)
    const searchFilter = {};
    if(search) searchFilter.email = { $regex: search, $options: "i" };

    // Subscription type filter
    const subscriptionStatusFilter = {};
    if(subscriptionStatus && !["all", "active", "expired", "canceled"].includes(subscriptionStatus))
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
        // Match
        { $match: searchFilter },

        // Sort
        { $sort: { createdAt: -1 } },
        
        // Lookup on user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "_id",
                foreignField: "userId",
                as: "userProfile",
                pipeline: [
                    { $match: searchFilter },
                    { $project: { _id: 0, fullName: 1 } }
                ]
            }
        },
        { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: true } },        

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
                email: 1,
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

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "_id",
                foreignField: "userId",
                as: "userProfile",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }]
            },
        },

        // Unwind
        { $unwind: "$userProfile" },

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
        { $project: { userProfile: 1, subscription: 1 } }
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
    const allowedTierTypes = ["Consumer / Individual", "Bronze", "Silver", "Gold", "Enterprise"];
    const allowedSubscriptionStatus = ["active", "expired", "canceled"];

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
                    { $match: { ...dateFilter } },
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
        { $unwind: { path: "$userProfile", preserveNullAndEmptyArrays: true } },
        { $unwind: { path: "$businessProfile", preserveNullAndEmptyArrays: true } },
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

// View paid user
const viewPaidUser = asyncHandler(async (request, response) => {
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
                            pipeline: [{ $project: { _id: 0, name: 1, price: 1 } }]
                        }
                    },
                    { $unwind: "$plan" },
                    { $project: { _id: 0, startDate: 1, endDate: 1, planName: "$plan.name", planPrice: "$plan.price" } }
               ] 
            }
        },        

        // Unwind
        { $unwind: "$subscription" },

        // Projection
        { $project: { email: 1, joinDate: "$createdAt", subscription: 1 } }
    ]);
    if(!user) throw new ApiError(404, "User not found");

    // Count lifetime subscription purchases
    const [lifetimeSubscriptionPurchases] = await SubscriptionHistory.aggregate([
        // Match
        { $match: { userId: convertToMongoId(userId) } },

        // Lookup plan
        {
            $lookup: {
                from: "plans",
                localField: "planId",
                foreignField: "_id",
                as: "plan",
                pipeline: [{ $project: { _id: 0, price: 1 } }]
            }
        },

        // Unwind
        { $unwind: "$plan" },

        // Group
        {
            $group: {
                _id: null,
                totalAmount: { $sum: "$plan.price" }
            }
        },

        // Projection
        { $project: { _id: 0, totalAmount: 1 } }
    ]);

    // Final computation
    const lifetimeValue = lifetimeSubscriptionPurchases?.totalAmount || 0;

    // Response
    return response.status(200).json(new ApiResponse(200, { ...user, lifetimeValue }, "Paid user details have been fetched"));
});

module.exports = { fetchSubscriptionStats, fetchTrialUsers, fetchPaidUsers, viewTrialUser, 
viewPaidUser };