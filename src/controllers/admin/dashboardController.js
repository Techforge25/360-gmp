const EscrowTransaction = require("../../models/escrowTrasanction");
const Plan = require("../../models/plan");
const Subscription = require("../../models/subscription");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// Fetch total platform revenue
const fetchTotalPlatformRevenue = asyncHandler(async (request, response) => {
    // Sum platform fee & held amount
    const [result] = await EscrowTransaction.aggregate([
        { $match:{} },
        {
            $group:{ 
                _id:null,
                totalPlatformRevenue: { $sum:"$platformFee" },
            }
        }
    ]);

    // Extract value
    const totalPlatformRevenue = result?.totalPlatformRevenue || 0;

    // Response
    return response.status(200).json(new ApiResponse(200, totalPlatformRevenue, "Total platform revenue has been fetched"));
});

// Fetch total platform revenue
const fetchTotalHeldAmount = asyncHandler(async (request, response) => {
    // Sum held amount
    const [result] = await EscrowTransaction.aggregate([
        { $match:{ status:"held" } },
        {
            $group:{ 
                _id:null,
                heldAmount: { $sum:"$totalAmount" },
            }
        }
    ]);

    // Extract value
    const heldAmount = result?.heldAmount || 0;

    // Response
    return response.status(200).json(new ApiResponse(200, heldAmount, "Total held amount has been fetched"));
});

// Fetch total trial users
const fetchTotalTrialUsers = asyncHandler(async (request, response) => {
    // Find trial plan
    const plan = await Plan.findOne({ name:"TRIAL" }).select("_id name").lean();
    if(!plan) throw new ApiError(404, "No trial plan found");

    // Count trial users
    const totalTrialUsers = await Subscription.countDocuments({ planId:plan._id });

    // Response
    return response.status(200).json(new ApiResponse(200, totalTrialUsers || 0, "Total trial users have been fetched"));
});

module.exports = { fetchTotalPlatformRevenue, fetchTotalHeldAmount, fetchTotalTrialUsers };