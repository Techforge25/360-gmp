const Product = require("../models/products");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { getBusinessProfile } = require("../utils/getProfiles");

// Fetch my products
const fetchMyProducts = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const businessProfile = await getBusinessProfile(userId);
    if (!businessProfile) throw new Error("Business profile not found");

    const products = await Product.aggregate([
        {
            $match: {
                businessId: businessProfile._id
            }
        },
        {
            $addFields: {
                stockFlag: {
                    $cond: [
                        { $lte: ["$stockQty", 0] },
                        "out-of-stock",
                        {
                            $cond: [
                                { $lte: ["$stockQty", "$lowStockThreshold"] },
                                "critical-threshold",
                                "in-stock"
                            ]
                        }
                    ]
                }
            }
        }
    ]);

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Products fetched successfully"));
});


module.exports = { fetchMyProducts };