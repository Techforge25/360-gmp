const { emptyList } = require("../../constants");
const EscrowTransaction = require("../../models/escrowTrasanction");
const Product = require("../../models/products");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// Sum total sales
const sumTotalSales = asyncHandler(async (request ,response) => {
    //Fetch
    const totalSales = await EscrowTransaction.aggregate([
        {
            $group:{
                _id:null,
                totalAmount: { $sum: "$totalAmount" }
            }
        }
    ]);

    // Prepare payload
    const payload = { totalSales: Number(totalSales[0]?.totalAmount) || 0 };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Sum of total sales have been fetched"));
});

// Sum pending products
const sumPendingProducts = asyncHandler(async (request, response) => {
    const pendingProducts = await Product.aggregate([
        { $match:{ status:"pending" } },

        // Sum
        {
            $group: {
                _id:null,
                totalPendingProducts:{ $sum:1 }
            }
        }
    ]);

    // Prepare payload
    const payload = { totalPendingProducts: Number(pendingProducts[0]?.totalPendingProducts) || 0 };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Sum of total pending products have been fetched"));    
});

module.exports = { sumTotalSales, sumPendingProducts };