const { emptyList } = require("../../constants");
const Subscription = require("../../models/subscription");
const User = require("../../models/users");
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

// Fetch trial users
const fetchTrialUsers = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search = "" } = request.query;

    // Pagination options
    const options = {
        page: Number(page),
        limit: Number(limit),
    };

    // Base filter
    const baseFilter = {};
    if(search) baseFilter.email = { $regex:search, $options:"i" };

    // Calculate days and message
    const today = new Date();
    const messageLimit = 4;

    // Fetch
    const aggregate = User.aggregate([
        // Match
        { $match:baseFilter },

        // Sort
        { $sort:{ createdAt:-1 } },       

        // Lookup on subscription
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "userId",
                as: "subscription"
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

        {
            $lookup: {
                from: "trialusages",
                localField: "_id",
                foreignField: "userId",
                as: "trialUsage"
            }
        },
        {
            $unwind: {
                path: "$trialUsage",
                preserveNullAndEmptyArrays: true
            }
        },

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
                daysRemaining: 1,
                messageLimit: { $literal: messageLimit },
                status: "$subscription.status",
                messagesUsed: { $ifNull: ["$trialUsage.messagesUsed", 0] }
            }
        }
    ]);

    // Execute query
    const trialUsers = await User.aggregatePaginate(aggregate, options);
    if(!trialUsers.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No trial users found"));

    // Response
    return response.status(200).json(new ApiResponse(200, trialUsers, "Trial users have been fetched"));    
});

// Fetch premium users
const fetchPremiumUsers = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search = "" } = request.query;

    // Pagination options
    const options = {
        page: Number(page),
        limit: Number(limit),
    };

    // Base filter
    const baseFilter = {};
    if(search) baseFilter.email = { $regex:search, $options:"i" };

    // Fetch
    const aggregate = User.aggregate([
        // Match
        { $match:baseFilter },

        // Sort
        { $sort:{ createdAt:-1 } },

        // Projection
        { $project: { email:1, createdAt:1 } },

        // Lookup inside subscription
        {
            $lookup: {
                from: "subscriptions",
                localField: "_id",
                foreignField: "userId",
                as:"subscription",
                pipeline: [
                    { $project:{ _id:0, planId:1, status:1 } },

                    // Lookup inside plans
                    {
                        $lookup:{
                            from: "plans",
                            localField: "planId",
                            foreignField: "_id",
                            as: "plan",
                            pipeline:[
                                { $project:{ _id:0, name:1 } }
                            ]
                        }
                    }
                ]
            },
        },

        // Unwind
        { $unwind: "$subscription" },
        { $unwind: "$subscription.plan" },

        // Match
        { $match:{ "subscription.plan.name": "PREMIUM" } },

        // Final projection
        {
            $project: { email:1, subscriptionTier: "$subscription.plan.name", joinDate:"$createdAt", status:"$subscription.status" }
        }
    ]);

    // Execute query
    const premiumUsers = await User.aggregatePaginate(aggregate, options);
    if(!premiumUsers.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No premium users found"));

    // Response
    return response.status(200).json(new ApiResponse(200, premiumUsers, "Premium users have been fetched"));
});

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

module.exports = { fetchSubscriptionStats, fetchTrialUsers, fetchPremiumUsers, fetchExpiringSubscriptions };