const { emptyList } = require("../../constants");
const EscrowTransaction = require("../../models/escrowTrasanction");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// Fetch total sales
const fetchTotalSales = asyncHandler(async (request ,response) => {
    //Fetch
    const totalSales = await EscrowTransaction.aggregate([
        {
            $group:{
                _id:null,
                totalAmount:{ $sum:1 }
            }
        },
    ]);

    // Prepare payload
    const payload = { totalSales: totalSales[0]?.totalAmount || 0 };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Total sales have been fetched"));
});

module.exports = { fetchTotalSales };