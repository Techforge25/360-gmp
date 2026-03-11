const { emptyList } = require("../../constants");
const Dispute = require("../../models/disputeModel");
const EscrowTransaction = require("../../models/escrowTrasanction");
const Order = require("../../models/orders");
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

// Sum disputed orders
const sumDisputedOrders = asyncHandler(async (request, response) => {
    // Fetch
    const disputedOrdersCount = await Dispute.countDocuments({ 
        status: { $in:["open", "under_review", "waiting_buyer", "waiting_seller"] } 
    });

    // Prepare payload
    const payload = { totalDisputedOrders: Number(disputedOrdersCount) || 0 };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Sum of disputed orders have been fetched"));   
});

// Fetch order logs
const fetchOrderLogs = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Pagination options
    const options = {
        page: Number(page),
        limit: Number(limit),
    };

    // Aggregate
    const aggregate = Order.aggregate([
        { $sort: { createdAt: -1 } },
        // Projection
        { $project:{ createdAt:1, buyerUserProfileId:1, items:1, totalAmount:1 } },

        // Lookup inside user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "buyerUserProfileId",
                foreignField: "_id",
                as: "userProfile",
                pipeline:[
                    { $project:{ _id:0, fullName:1, logo:1 } }
                ]
            }
        },

        // Lookup inside escrow transaction to get payment status
        {
            $lookup: {
                from: "escrowtransactions",
                localField: "_id",
                foreignField: "orderId",
                as: "escrowTransaction"
            }
        },

        // Unwind
        { $unwind: "$userProfile" },
        { $unwind: "$escrowTransaction" },

        // Final projection
        {
            $project:{
                createdAt:1,
                buyerInfo:"$userProfile",
                orderType:{
                    $cond:[
                        {
                            $gt:[
                                {
                                    $size:{
                                        $filter:{
                                            input:"$items",
                                            as:"item",
                                            cond:{ $gt:["$$item.quantity", 1] }
                                        }
                                    }
                                },
                                0
                            ]
                        },
                        "bulk",
                        "single"
                    ]
                },
                paymentType:"$escrowTransaction.status",
                totalAmount:1
            }
        }
    ]);

    // Execute query
    const orders = await Order.aggregatePaginate(aggregate, options);
    if(!orders.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No order logs found"));

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Order logs have been fetched"));
});

// Fetch product audits
const fetchProductAudits = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Pagination options
    const options = {
        page: Number(page),
        limit: Number(limit),
    };

    // Aggregate
    const aggregate = Product.aggregate([
        // Pending
        // { $match:{ status: "pending" } },

        // Sort
        { $sort:{ createdAt: -1 } },

        // Lookup inside business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "businessId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline:[
                    { $project:{ _id:0, companyName:1, logo:1 } }
                ]
            }
        },

        // Unwind
        { $unwind: "$businessProfile" },

        // Projection
        { $project:{ title:1, createdAt:1, sellerInfo:"$businessProfile", category:1, status:1 } }
    ]);

    // Execute query
    const products = await Product.aggregatePaginate(aggregate, options);
    if(!products.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No product audits found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Order logs have been fetched"));    
});

module.exports = { sumTotalSales, sumPendingProducts, sumDisputedOrders, fetchOrderLogs, fetchProductAudits };