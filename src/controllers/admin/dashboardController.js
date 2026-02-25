const EscrowTransaction = require("../../models/escrowTrasanction");
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

module.exports = { fetchTotalPlatformRevenue, fetchTotalHeldAmount };