const BusinessProfile = require("../models/businessProfileSchema");
const Order = require("../models/orders");
const Product = require("../models/products");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { getBusinessProfile } = require("../utils/getProfiles");
const validate = require("../utils/validate");
const { updateBusinessContactValidator } = require("../validations/updateBusinessContactValidator");

// Fetch my products
const fetchMyProducts = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const businessProfile = await getBusinessProfile(userId);
    if (!businessProfile) throw new ApiError(404, "Business profile not found");

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

// Fetch low stock products for business
const fetchLowStockProducts = asyncHandler(async (request, response) => {
    const userId = request.user?._id;
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id");
    if(!business) throw new ApiError(404, "Business not found");

    // Fetch low stock products
    const products = await Product.find({ businessId:business._id, status:"approved",
        $expr: {
            $lte: ["$stockQty", "$lowStockThreshold"]
        }
    })
    .sort({ stockQty: 1 }) // most critical first
    .limit(5)
    .select("title stockQty lowStockThreshold")
    .lean();

    // Response if no low stock products
    if(!products.length) return response.status(200).json(new ApiResponse(200, [], "No low stock products found"));
    
    // Response
    return response.status(200).json(new ApiResponse(200, products, "Low stock products have been fetched"));
});

// Top performing products
const topPerformingProducts = asyncHandler(async (request, response) => {
    // Get the current user's business profile
    const businessProfile = await getBusinessProfile(request.user._id);
    if (!businessProfile) throw new ApiError(404, "Business profile not found");

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
    return response.status(200).json(new ApiResponse(200, { data:products, count:products.length }, "Top performing products fetched successfully"));
});

// Update map url
const updateMapURL = asyncHandler(async (request, response) => {
    // Get business profile
    const businessProfile = await BusinessProfile.findOne({ ownerUserId:request.user._id });
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Validate input
    const { mapURL } = request.body;
    if(!mapURL) throw new ApiError(400, "mapURL is required");

    // Update and save
    businessProfile.mapURL = mapURL || businessProfile.mapURL;
    await businessProfile.save();

    // Response
    return response.status(200).json(new ApiResponse(200, mapURL, "Map URL updated successfully"));
});

// Viewed by users
const viewBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { businessProfileId } = request.params;

    // Get business profile
    const businessProfile = await BusinessProfile.findById(businessProfileId);
    if (!businessProfile) throw new ApiError(404, "Business profile not found");

    // Update viewedBy and viewsCount
    if(!businessProfile.viewedBy.includes(userId) && userId.toString() !== businessProfile.ownerUserId.toString())
    {
        businessProfile.viewedBy.push(userId);
        businessProfile.viewsCount += 1;
        await businessProfile.save();
    }

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Business profile viewed"));
});

// fetch view counts
const fetchViewCounts = asyncHandler(async (request, response) => {
    // Get business profile
    const businessProfile = await BusinessProfile.findOne({ ownerUserId: request.user._id });
    if (!businessProfile) throw new ApiError(404, "Business profile not found");

    // Get views count
    const viewsCount = Number(businessProfile.viewsCount) || 0;

    // Response
    return response.status(200).json(new ApiResponse(200, viewsCount, "View count fetched successfully"));
});

// Update business contact information
const updateContactInfo = asyncHandler(async (request, response) => {
    // Get business profile
    const businessProfile = await BusinessProfile.findOne({ ownerUserId: request.user._id });
    if (!businessProfile) throw new ApiError(404, "Business profile not found");

    // Validate input
    const { description, certifications, phone, supportEmail, website, location } = validate(updateBusinessContactValidator, request.body);
    
    // Update and save
    businessProfile.description = description || businessProfile.description;
    businessProfile.certifications = certifications || businessProfile.certifications;
    businessProfile.b2bContact.phone = phone || businessProfile.b2bContact.phone;
    businessProfile.b2bContact.supportEmail = supportEmail || businessProfile.b2bContact.supportEmail;
    businessProfile.website = website || businessProfile.website;
    businessProfile.location = location || businessProfile.location;
    await businessProfile.save();

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfile, "Contact information updated successfully"));
});

module.exports = { fetchMyProducts, topPerformingProducts, updateMapURL, viewBusinessProfile,
fetchViewCounts, updateContactInfo, fetchLowStockProducts };