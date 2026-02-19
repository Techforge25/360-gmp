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
const fetchAllProducts = asyncHandler(async (request, response) => {
    // Pagination options
    const { page = 1, limit = 10, search = "" } = request.query;

    // Filter options
    const { category, moq, certification, country } = request.query;

    // Base product filter
    const filter = {
        title: { $regex: search, $options: "i" },
        // status: "approved"
    };

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

    // Fetch products
    const products = await Product.paginate(filter, { page, limit, sort:{ createdAt:-1 }});
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Products not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "All products have been fetched"));
});

// Fetch featured products (Shown on market place)
const fetchFeaturedProducts = asyncHandler(async (request, response) => {
    // Pagination options
    const { page = 1, limit = 10 } = request.query;
    
    // Find products
    const products = await Product.paginate({ isFeatured:true, status:"approved" }, { page, limit });
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Featured Products not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "All Featured products have been fetched"));
});

// Fetch all business products (Shown on business profile)
const fetchBusinessProducts = asyncHandler(async (request, response) => {
    const { businessId } = request.params;
    const business = await BusinessProfile.findById(businessId).lean();
    if(!business) throw new ApiError(404, "Business not found");    

    // Pagination options
    const { page = 1, limit = 10 } = request.query;
    const products = await Product.paginate({ businessId }, { page, limit });
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Business products not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Business products have been fetched"));
});

// Fetch business featured products (Shown on business profile)
const fetchBusinessFeaturedProducts = asyncHandler(async (request, response) => {
    const { businessId } = request.params;
    const business = await BusinessProfile.findById(businessId).lean();
    if(!business) throw new ApiError(404, "Business not found");    

    // Pagination options
    const { page = 1, limit = 10 } = request.query;
    const products = await Product.paginate({ businessId, isFeatured:true }, { page, limit });
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Business featured products not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Business featured products have been fetched"));
});

// View product
const viewProduct = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);
    const { productId } = request.params;

    // Find product and business profile
    const [product, businessProfile] = await Promise.all([
        Product.findById(productId),
        BusinessProfile.findOne({ ownerUserId:userId }).select("_id")
    ]);
    if(!product) throw new ApiError(404, "Product not found");

    // Owner flag
    const isOwner = businessProfile && String(product.businessId) === String(businessProfile._id);

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

    // Response
    return response.status(200).json(new ApiResponse(200, product, "Product has been fetched"));
});

// Update product
const updateProduct = asyncHandler(async (request, response) => {
    const { productId } = request.params;
    const userId = request.user?._id;
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id");
    if(!business) throw new ApiError(404, "Business not found");

    const payload = validate(createProductSchema, request.body);
    const product = await Product.findByIdAndUpdate(productId, payload, { new:true, lean:true });
    return response.status(200).json(new ApiResponse(200, product, "Product created successfully"));
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

    // Update product
    const product = await Product.findByIdAndUpdate(productId, { isFeatured }, { new:true, lean:true })
    .select("title isFeatured businessId");
    if(!product) throw new ApiError(404, "Product not found");

    // Verify product ownership
    if(product.businessId.toString() !== business._id.toString()) throw new ApiError(403, "You are not authorized to update this product");

    // Response
    const responseMessage = isFeatured ? "Product has been marked as featured" : "Product has been unmarked as featured";
    return response.status(200).json(new ApiResponse(200, product, responseMessage));
});

// Delete product
const deleteProduct = asyncHandler(async (request, response) => {
    const { productId } = request.params;
    const product = await Product.findByIdAndDelete(productId).lean();
    if(!product) throw new ApiError(404, "Product not found");
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
    // Find products
    const products = await Product.find({ status:"approved", isFlashDeal:true })
    .select("title detail image minOrderQty pricePerUnit extras").sort("-createdAt").limit(30)
    if(!products.length) return response.status(200).json(new ApiResponse(200, emptyList, "Latest products not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Latest products have been fetched"));
});

module.exports = { createProduct, fetchAllProducts, fetchFeaturedProducts, fetchBusinessProducts,
fetchBusinessFeaturedProducts, viewProduct, updateProduct, setFeaturedProduct, 
deleteProduct, fetchTopRankingProducts, fetchNewProducts, fetchFlashDeals };