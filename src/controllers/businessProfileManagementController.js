const Order = require("../models/orders");
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

// Top performing products
const topPerformingProducts = asyncHandler(async (req, res) => {
    // Get the current user's business profile
    const businessProfile = await getBusinessProfile(req.user._id);
    if (!businessProfile) throw new Error("Business profile not found");

    // Aggregate orders to calculate top performing products
    const products = await Order.aggregate([
        // Match orders belonging to this business
        { $match: { sellerBusinessId: businessProfile._id } },

        // Unwind items array to process each product individually
        { $unwind: "$items" },

        // Lookup product details from Product collection
        {
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" }, // Flatten the array returned by $lookup

        // Group by productId to calculate total quantity sold and total revenue
        {
            $group: {
                _id: "$items.productId",
                title: { $first: "$productInfo.title" },        // Product title
                totalSoldQty: { $sum: "$items.quantity" },      // Total quantity sold
                totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.priceAtPurchase"] } } // Total revenue
            }
        },

        // Sort products by totalRevenue descending
        { $sort: { totalRevenue: -1 } },

        // Limit to top 10 products (optional)
        { $limit: 10 }
    ]);

    // Return the aggregated result
    return res.status(200).json(new ApiResponse(200, { count:products.length, data:products }, "Top performing products fetched successfully"));
});

module.exports = { fetchMyProducts, topPerformingProducts };