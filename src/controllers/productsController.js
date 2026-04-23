const { emptyList } = require("../constants");
const BusinessProfile = require("../models/businessProfileSchema");
const Product = require("../models/products");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createProductSchema } = require("../validations/productsValidator");
const Order = require("../models/orders");
const convertToMongoId = require("../utils/convertToMongoId");
const ProductReview = require("../models/productReviewModel");
const { isValidObjectId } = require("mongoose");

// Create product
const createProduct = asyncHandler(async (request, response) => {
    const userId = request.user?._id;

    // Get validated payload
    const payload = validate(createProductSchema, request.body);

    // Find business
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id");
    if(!business) throw new ApiError(404, "Business not found");

    // Savve to db
    const product = await Product.create({ ...payload, businessId:business._id });

    // Response
    return response.status(201).json(new ApiResponse(201, product, "Product created successfully"));
});

// Fetch all products with filters (Shown on market place)
// const fetchAllProducts = asyncHandler(async (request, response) => {
//     // Pagination options
//     const { page = 1, limit = 10, search } = request.query;

//     // Filter options
//     const { category, moq, certification, country } = request.query;

//     // Base product filter
//     const filter = {};
//     if(search) filter.title = { $regex:search, $options:"i" };

//     // Category filter
//     if(category) filter.category = { $regex:category, $options: "i" };
    
//     // MOQ filter
//     if(moq) filter.minOrderQty = { $lte: Number(moq) };

//     // Certification / Country filter (via BusinessProfile)
//     if(certification || country)
//     {
//         const businessFilter = {};

//         if(certification) businessFilter.certifications = { $regex:certification, $options:"i" };
//         if(country) businessFilter["location.country"] = { $regex:country, $options:"i" };

//         // Fetch business
//         const businesses = await BusinessProfile.find(businessFilter).select("_id");

//         // Get businesses ids
//         const businessIds = businesses.map(b => b._id);

//         // No matching businesses = empty result
//         if(!businessIds.length) return response.status(200).json(new ApiResponse(200, emptyList, "Products not found"));
//         filter.businessId = { $in:businessIds };
//     }

//     // Fetch products
//     const products = await Product.paginate(filter, { page, limit, sort:{ createdAt:-1 }});
//     if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Products not found"));

//     // Response
//     return response.status(200).json(new ApiResponse(200, products, "All products have been fetched"));
// });

// Fetch all products with filters (Shown on market place)
const fetchAllProducts = asyncHandler(async (request, response) => {
    // Pagination options
    const { page = 1, limit = 10, search } = request.query;

    // Filter options
    const { category, moq, certification, country } = request.query;

    // Base product filter
    const filter = {};
    if(search) filter.title = { $regex:search, $options:"i" };

    // Category filter
    if(category) filter.category = { $regex:category, $options: "i" };
    
    // MOQ filter
    if(moq) filter.minOrderQty = { $lte: Number(moq) };

    // Certification / Country filter (via BusinessProfile)
    if(certification || country)
    {
        const businessFilter = {};

        if(certification) businessFilter.certifications = { $regex:certification, $options:"i" };
        if(country) businessFilter["location.country"] = { $regex:country, $options:"i" };

        // Fetch business
        const businesses = await BusinessProfile.find(businessFilter).select("_id");

        // Get businesses ids
        const businessIds = businesses.map(b => b._id);

        // No matching businesses = empty result
        if(!businessIds.length) return response.status(200).json(new ApiResponse(200, emptyList, "Products not found"));
        filter.businessId = { $in:businessIds };
    }

    // Aggregate pipeline
    const products = await Product.aggregatePaginate([
        { $match: filter },

        // Join reviews
        {
            $lookup: {
                from: "productreviews",
                localField: "_id",
                foreignField: "productId",
                as: "reviews"
            }
        },

        // Add totalReviews and avgRating
        {
            $addFields: {
                totalReviews: { $size: "$reviews" },
                avgRating: { $avg: "$reviews.rating" }
            }
        },

        // Default 0 if no reviews
        {
            $addFields: {
                avgRating: { $ifNull: ["$avgRating", 0] }
            }
        },

        // Sort by avgRating then totalReviews
        {
            $sort: {
                totalReviews: -1,
                avgRating: -1,
                createdAt: -1
            }
        },

        // Projection
        { $project:{ __v:0, updatedAt:0, reviews:0 } }
    ], { page, limit });
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Products not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "All products have been fetched"));
});

// Fetch featured products (Shown on market place)
const fetchFeaturedProducts = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    const options = {
        page: Number(page),
        limit: Number(limit),
        populate:{ path:"businessId", select:"ownerUserId" },
        sort:{ createdAt:-1 }
    };
    
    // Find products
    const products = await Product.paginate({ isFeatured:true, status:"approved" }, options);
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Featured Products not found")); 

    // Get owner flag
    const updatedProducts = products.docs.map((product) => {
        let isOwner = false;
        if(product.businessId)
        {    
            const { ownerUserId } = product.businessId;
            isOwner = ownerUserId?.equals(userId);
            return { ...product.toObject(), isOwner };
        }
    });    

    // Response
    return response.status(200).json(new ApiResponse(200, updatedProducts, "All Featured products have been fetched"));
});

// Fetch business featured products (Shown on business profile)
const fetchBusinessFeaturedProducts = asyncHandler(async (request, response) => {
    const { businessId } = request.params;
    const business = await BusinessProfile.findById(businessId).lean();
    if(!business) throw new ApiError(404, "Business not found");    

    // Pagination options
    const { page = 1, limit = 10 } = request.query;
    const products = await Product.paginate({ businessId, isFeatured:true }, { page, limit, sort:{ createdAt:-1 } });
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Business featured products not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Business featured products have been fetched"));
});

const viewProduct = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);
    const { productId } = request.params;
    if(!isValidObjectId(productId)) throw new ApiError(400, "Invalid product ID");

    // Fetch product + business profile + rating stats
    const [product, businessProfile, ratingStats, sold] = await Promise.all([
        Product.findById(productId)
        .populate({ path:"businessId", select:"_id companyName foundedDate logo" })
        .select("-__v -updatedAt"),

        BusinessProfile.findOne({ ownerUserId:userId }).select("_id"),

        ProductReview.aggregate([
            { $match: { productId: convertToMongoId(productId) } },
            {
                $group: {
                    _id: "$productId",
                    avgRating: { $avg: "$rating" },
                    totalReviews: { $sum: 1 }
                }
            }
        ]),
        
        // Total sold
        Order.countDocuments({ "items.productId": productId, status: "completed" })
    ]);
    if(!product) throw new ApiError(404, "Product not found");

    // Owner flag
    const isOwner = product.businessId._id.equals(businessProfile?._id);

    // Check if already viewed
    const alreadyViewed = product.viewedBy.some(id => String(id) === String(userId));

    // Add unique view
    if (!alreadyViewed && !isOwner) 
    {
        await Product.findByIdAndUpdate(productId, { 
            $addToSet:{ viewedBy:userId }, 
            $inc:{ viewsCount:1 } 
        });
    }

    // Extract rating data
    const avgRating = ratingStats[0]?.avgRating || 0;
    const totalReviews = ratingStats[0]?.totalReviews || 0;

    // Prepare payload
    const payload = {
        ...product.toObject(),
        isOwner, 
        avgRating: Number(avgRating.toFixed(1)), 
        totalReviews,
        sold
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Product has been fetched"));
});

// Update product
const updateProduct = asyncHandler(async (request, response) => {
    const { productId } = request.params;
    const userId = request.user?._id;
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id");
    if(!business) throw new ApiError(404, "Business not found");

    // Find product
    const product = await Product.findById(productId).select("_id businessId").lean();
    if(!product) throw new ApiError(404, "Product not found");

    // Check authorization
    if(!product.businessId.equals(business._id)) throw new ApiError(403, "Unauthorized! You cannot update this product");

    // Get validated payload
    const payload = validate(createProductSchema, request.body);

    // Update
    const updateProduct = await Product.findByIdAndUpdate(productId, payload, { new:true, lean:true });
    if(!updateProduct) throw new ApiError(500, "Failed to update product");

    // Response
    return response.status(200).json(new ApiResponse(200, updateProduct, "Product updated successfully"));
});

// Set to featured product
const setFeaturedProduct = asyncHandler(async (request, response) => {
    const { productId } = request.params;
    const userId = request.user?._id;
    const { isFeatured } = request.body || {};

    // Validate isFeatured
    if(!isFeatured && isFeatured !== false) throw new ApiError(400, "isFeatured flag is required");

    // Verify business ownership
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id");
    if(!business) throw new ApiError(404, "Business not found");

    // Update with authorization check
    const product = await Product.findOneAndUpdate(
        { _id: productId, businessId: business._id },
        { isFeatured },
        { new:true, lean:true }
    ).select("title isFeatured businessId");
    if(!product) throw new ApiError(404, "Product not found or unauthorized");

    // Response message
    const responseMessage = isFeatured ? "Product has been marked as featured" : "Product has been unmarked as featured";

    // Response
    return response.status(200).json(new ApiResponse(200, updateProduct, responseMessage));
});

// Delete product
const deleteProduct = asyncHandler(async (request, response) => {
    const userId = request.user._id
    const { productId } = request.params;
    if(!isValidObjectId(productId)) throw new ApiError(400, "Invalid MongoDB ID! Please provide a valid product ID");

    // Find business
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id").lean();
    if(!business) throw new ApiError(404, "Business not found");

    // Find product
    const product = await Product.findById(productId).select("_id businessId").lean();
    if(!product) throw new ApiError(404, "Product not found");

    // Check authorization
    if(!product.businessId.equals(business._id))
    {
        throw new ApiError(403, "Unauthorized! You cannot delete this product");
    }

    const deleteProduct = await Product.findByIdAndDelete(productId);
    if(!deleteProduct) throw new ApiError(500, "Failed to delete product");

    // Response
    return response.status(200).json(new ApiResponse(200, product, "Product has been deleted"));
});

// Fetch top ranking products (top-selling) (Shown on market place)
const fetchTopRankingProducts = asyncHandler(async (request, response) => {
    const { limit = 10 } = request.query;

    const topProducts = await Order.aggregate([
        // Only completed orders (closed deals)
        {
            $match: { status: "completed" }
        },

        // Break items array
        {
            $unwind: "$items"
        },

        // Group by productId
        {
            $group: {
                _id: "$items.productId",
                totalSoldQty: { $sum: "$items.quantity" },
                totalRevenue: {
                    $sum: {
                        $multiply: ["$items.quantity", "$items.priceAtPurchase"]
                    }
                }
            }
        },

        // Sort by quantity sold
        {
            $sort: { totalSoldQty: -1 }
        },

        // Limit results
        {
            $limit: Number(limit)
        },

        // Join product details
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },

        // Flatten product array
        {
            $unwind: "$product"
        },

        // Shape response
        {
            $project: {
                _id: 0,
                productId: "$product._id",
                title: "$product.title",
                detail: "$product.detail",
                moq: "$product.minOrderQty",
                image: "$product.image",
                pricePerUnit: "$product.pricePerUnit",
                // category: "$product.category",
                // totalSoldQty: 1,
                // totalRevenue: 1,
            }
        }
    ]);

    // No top selling products found
    if(!topProducts.length) return response.status(200).json(new ApiResponse(200, emptyList, "No top selling products found"));
    
    // Response
    return response.status(200).json(new ApiResponse(200, topProducts, "Top selling products fetched successfully")); 
});

// Fetch new products (Latest 30 products) (Shown on market place)
const fetchNewProducts = asyncHandler(async (request, response) => {    

    // Find products
    const products = await Product.find({ status:"approved" })
    .select("title detail image minOrderQty pricePerUnit").sort("-createdAt").limit(30)
    if(!products.length) return response.status(200).json(new ApiResponse(200, emptyList, "Latest products not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Latest products have been fetched"));
});

// Fetch flash deals (Top-deals products) (Shown on market place)
const fetchFlashDeals = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Fetch
    const products = await Product.find({ status:"approved", isFlashDeal:true })
    .populate("businessId", "ownerUserId")
    .select("title detail image minOrderQty pricePerUnit extras businessId")
    .sort("-createdAt")
    .limit(30);
    if(!products.length) return response.status(200).json(new ApiResponse(200, [], "Latest products not found"));
    
    // Get owner flag
    const updatedProducts = products.map((product) => {
        const { ownerUserId } = product.businessId;
        
        // Owner flag
        const isOwner = ownerUserId.equals(userId);

        return { ...product.toObject(), isOwner };
    });
    // Response
    return response.status(200).json(new ApiResponse(200, updatedProducts, "Latest products fetched"));
});

module.exports = { createProduct, fetchAllProducts, fetchFeaturedProducts,
fetchBusinessFeaturedProducts, viewProduct, updateProduct, setFeaturedProduct, 
deleteProduct, fetchTopRankingProducts, fetchNewProducts, fetchFlashDeals };