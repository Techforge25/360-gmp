const EscrowTransaction = require("../../models/escrowTrasanction");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// Sum total platform commission
const sumPlatformCommission = asyncHandler(async (request, response) => {
    // Fetch
    const escrow = await EscrowTransaction.aggregate([
        // Sum
        {
            $group: {
                _id: null,
                platformFee: { $sum: "$platformFee" }
            }
        }
    ]);

    // Normalize
    const platformFee = escrow[0]?.platformFee || 0;

    // Response
    return response.status(200).json(new ApiResponse(200, platformFee, "Total platform fee has been fetched"));
});

// Sum held amount in escrow
const sumHelAmount = asyncHandler(async (request, response) => {
    // Fetch
    const escrow = await EscrowTransaction.aggregate([
        // Match
        { $match:{ status:"held" } },

        // Sum
        {
            $group: {
                _id: null,
                totalAmount: { $sum: "$totalAmount" }
            }
        }
    ]);

    // Normalize
    const totalAmount = escrow[0]?.totalAmount || 0;

    // Response
    return response.status(200).json(new ApiResponse(200, totalAmount, "Total held amount has been fetched"));
});

module.exports = { sumPlatformCommission, sumHelAmount };