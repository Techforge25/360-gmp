const { isValidObjectId } = require("mongoose");
const { emptyList } = require("../../constants");
const Dispute = require("../../models/disputeModel");
const EscrowTransaction = require("../../models/escrowTrasanction");
const Order = require("../../models/orders");
const Product = require("../../models/products");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const getDateFilter = require("../../utils/dateFilter");
const ApiError = require("../../utils/ApiError");
const convertToMongoId = require("../../utils/convertToMongoId");
const validate = require("../../utils/validate");
const { rejectProductValidator } = require("../../validations/productsValidator");
const sendNotification = require("../../utils/sendNotification");

// Fetch market place stats
const fetchMarketplaceStats = asyncHandler(async (request, response) => {
    // Get date filter
    const { dateFilter } = getDateFilter(request);

    // Fetch
    const [[totalSales], totalPendingProducts, totalDisputedOrders, [totalFundsHeldInEscrow]] = await Promise.all([
        // Total sales
        EscrowTransaction.aggregate([
            { $match: { ...dateFilter, status: "released" } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$totalAmount" }
                }
            }
        ]),
        
        // Pending products
        Product.countDocuments({ ...dateFilter, status: "pending" }),

        // Total dispute
        Order.countDocuments({ ...dateFilter, status: "disputed" }),

        // Total funds held in escrow
        EscrowTransaction.aggregate([
            { $match: { ...dateFilter, status: "held" } },
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$totalAmount" }
                }
            }            
        ])
    ]);

    // Payload
    const payload = {
        totalSales: Number(totalSales?.totalAmount.toFixed(2)) || 0,
        totalPendingProducts: Number(totalPendingProducts.toFixed(2)) || 0,
        totalDisputedOrders: Number(totalDisputedOrders.toFixed(2)) || 0,
        totalFundsHeldInEscrow: Number(totalFundsHeldInEscrow.totalAmount.toFixed(2)) || 0
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Marketplace stats have been fetched"));
});

// Fetch order logs
const fetchOrderLogs = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(request);    

    // Aggregate
    const orders = await Order.aggregatePaginate([
        // Match
        { $match: dateFilter },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        { $project:{ createdAt: 1, buyerUserProfileId: 1, sellerBusinessId: 1, items: 1, totalAmount: 1, orderStatus: "$status" } },

        // Lookup user profile
        {
            $lookup: {
                from: "userprofiles",
                localField: "buyerUserProfileId",
                foreignField: "_id",
                as: "userProfile",
                pipeline: [
                    { $project:{ _id: 0, fullName: 1, email: 1, logo: 1 } }
                ]
            }
        },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "sellerBusinessId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline: [
                    { $project:{ _id: 0, companyName: 1, logo: 1, email: "$primaryContactPerson.supportEmail" } }
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
        { $unwind: "$businessProfile" },
        { $unwind: "$escrowTransaction" },

        // Final projection
        {
            $project:{
                createdAt: 1,
                buyerInfo: "$userProfile",
                sellerInfo: "$businessProfile",
                totalAmount: 1,
                orderStatus: 1
            }
        }
    ], { page, limit });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No order logs found"));

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Order logs have been fetched"));
});

// View order log
const viewOrderLog = asyncHandler(async (request, response) => {
    const { orderId } = request.params;
    if(!isValidObjectId(orderId)) throw new ApiError(400, "Invalid Order ID");

    // Aggregate
    const [order] = await Order.aggregate([
        // Match
        { $match: { _id: convertToMongoId(orderId) } },

        // Lookup user profile (buyer)
        {
            $lookup: {
                from: "userprofiles",
                localField: "buyerUserProfileId",
                foreignField: "_id",
                as: "buyer",
                pipeline: [{ $project: { _id: 0, fullName: 1, email: 1, logo: 1 } }]
            }
        },

        // Lookup business profile (seller)
        {
            $lookup: {
                from: "businessprofiles",
                localField: "sellerBusinessId",
                foreignField: "_id",
                as: "seller",
                pipeline: [{ $project: { _id: 0, companyName: 1, email: "$primaryContactPerson.supportEmail", logo: 1 } }]
            }
        },        

        // Lookup products
        {
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "orderItems",
                pipeline: [{ $project: { _id: 0, title: 1, image: 1, pricePerUnit: 1 } }]
            }
        },     
        
        // Lookup products
        {
            $lookup: {
                from: "escrowtransactions",
                localField: "_id",
                foreignField: "orderId",
                as: "escrowTransaction",
                pipeline: [{ $project: { _id: 0, platformFee: 1 } }]
            }
        },          

        // Unwind
        { $unwind: "$buyer" },
        { $unwind: "$seller" },
        { $unwind: "$escrowTransaction" },

        // Projection
        {
            $project: {
                buyer: 1,
                seller: 1,
                orderItems: 1,
                tracking: 1,
                createdAt: 1,
                completedAt: 1,
                totalAmount: 1,
                platformFee: "$escrowTransaction.platformFee"
            }
        },
    ]);
    if(!order) throw new ApiError(404, "Order not found");

    // Response
    return response.status(200).json(new ApiResponse(200, order, "Order details have been fetched"));
});

// Fetch product audits
const fetchProductAudits = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(request);      

    // Aggregate
    const products = await Product.aggregatePaginate([
        // Pending
        { $match: { ...dateFilter, status: "pending" } },

        // Sort
        { $sort: { createdAt: -1 } },

        // Lookup inside business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "businessId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline: [
                    { $project: { _id: 0, companyName: 1, ownerName: 1, logo: 1 } }
                ]
            }
        },

        // Unwind
        { $unwind: "$businessProfile" },

        // Projection
        { $project:{ title: 1, createdAt: 1, sellerInfo: "$businessProfile", category: 1 } }
    ], { page, limit });
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No product audits found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Product audits have been fetched"));    
});

// View product audit details
const viewProductAuditDetails = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { productId } = request.params;
    if(!isValidObjectId(productId)) throw new ApiError(400, "Invalid product ID");

    const [product] = await Product.aggregate([
        // Match
        { $match: { _id: convertToMongoId(productId) } },

        // Lookup business profile
        {
            $lookup: {
                from: "businessprofiles",
                localField: "businessId",
                foreignField: "_id",
                as: "businessProfile",
                pipeline: [{ $project: { _id: 0, companyName: 1, logo: 1 } }]
            }
        },
        { $unwind: "$businessProfile" },

        // Project
        {
            $project: {
                businessProfile: 1,
                title: 1,
                detail: 1,
                image: 1,
                groupImages: 1,
                category: 1,
                pricePerUnit: 1,
                tieredPricing: 1,
                minOrderQty: 1,
            }
        }
    ]);
    if(!product) throw new ApiError(404, "Product not found");

    // Response
    return response.status(200).json(new ApiResponse(200, product, "Product has been fetched"));
});

// Update product status
const updateProductStatus = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { productId } = request.params;
    if(!isValidObjectId(productId)) throw new ApiError(400, "Invalid product ID");

    // Get status
    const { status } = request.body || {};
    if(!status) throw new ApiError(400, "Product status is required");
    if(!["approved", "rejected"].includes(status)) throw new ApiError(400, "Invalid status type");

    // Find product
    const product = await Product.findById(productId);
    if(!product) throw new ApiError(404, "Product not found");

    // Validate
    if(product.status !== "pending") throw new ApiError(400, "You can only approve or reject a product that is in the pending state");

    // Update
    product.status = status;
    await product.save();

    // Response
    return response.status(200).json(new ApiResponse(200, status, `Product has been ${status}`));
});

// Approve product
const approveProduct = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { productId } = request.params;
    if(!isValidObjectId(productId)) throw new ApiError(400, "Invalid product ID");

    // Find and validate
    const product = await Product.findById(productId)
    .populate({ path: "businessId", select: "ownerUserId" });
    if(!product) throw new ApiError(404, "Product not found");
    if(product.status !== "pending") throw new ApiError(400, "You can only approve product when it is in pending state");

    // Update
    product.status = "approved";
    product.approval = { approvedBy: request.admin._id, approvedAt: new Date() };
    await product.save();

    // Send notification to product owner
    await sendNotification({
        userId: product.businessId.ownerUserId,
        type: "BusinessProfile",
        title: "Product Approval",
        content: `Your product "${product.title}" has been approved by admin`,
        io: request.app.get("io")
    }); 

    // Response
    return response.status(200).json(new ApiResponse(200, null, `Product has been approved`));
});

// Reject product
const rejectProduct = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { productId } = request.params;
    if(!isValidObjectId(productId)) throw new ApiError(400, "Invalid product ID");

    // Get validated payload
    const { note } = validate(rejectProductValidator, request.body);

    // Find and validate
    const product = await Product.findById(productId)
    .populate({ path: "businessId", select: "ownerUserId" });
    if(!product) throw new ApiError(404, "Product not found");
    if(product.status !== "pending") throw new ApiError(400, "You can only reject product when it is in pending state");

    // Update
    product.status = "rejected";
    product.rejection = { rejectedBy: request.admin._id, rejectedAt: new Date(), note };
    await product.save();

    // Send notification to product owner
    await sendNotification({
        userId: product.businessId.ownerUserId,
        type: "BusinessProfile",
        title: "Product Rejection",
        content: `Your product "${product.title}" has been rejected by admin. Reason: ${note}`,
        io: request.app.get("io")
    });     

    // Response
    return response.status(200).json(new ApiResponse(200, null, `Product has been rejected`));
});

// Fetch disputed order logs
const fetchDisputedOrders = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Aggregate
    const orders = await Order.aggregatePaginate([
        // Sort
        { $sort:{ createdAt: -1 } },

        // Projection
        { $project:{ createdAt:1, totalAmount:1, buyerUserProfileId:1, sellerBusinessId:1 } },

        // Lookup inside escrow transaction
        {
            $lookup: {
                from: "escrowtransactions",
                localField: "_id",
                foreignField: "orderId",
                as: "escrow"
            }
        },

        // Lookup inside user profile (Buyer)
        {
            $lookup: {
                from: "userprofiles",
                localField: "buyerUserProfileId",
                foreignField: "_id",
                as: "buyer"
            }
        },      
        
        // Lookup inside business profile (Seller)
        {
            $lookup: {
                from: "businessprofiles",
                localField: "sellerBusinessId",
                foreignField: "_id",
                as: "seller"
            }
        },         

        // Unwind
        { $unwind: "$escrow" },
        { $unwind: "$buyer" },
        { $unwind: "$seller" },

        // Final projection
        {
            $project: { 
                createdAt: 1, 
                totalAmount: 1, 
                status: "$escrow.status",
                buyer: "$buyer.fullName", 
                seller: "$seller.companyName"
            }
        }
    ], { page, limit });
    if(!orders.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No disputed orders found"));

    // Response
    return response.status(200).json(new ApiResponse(200, orders, "Disputed order logs have been fetched"));    
});

module.exports = { fetchMarketplaceStats, fetchOrderLogs, viewOrderLog, 
fetchProductAudits, viewProductAuditDetails, fetchDisputedOrders, updateProductStatus,
approveProduct, rejectProduct };