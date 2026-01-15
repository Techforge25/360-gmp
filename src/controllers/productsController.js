const { emptyList } = require("../constants");
const BusinessProfile = require("../models/businessProfileSchema");
const Product = require("../models/products");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { createProductSchema } = require("../validations/productsValidator");

// Create product
const createProduct = asyncHandler(async (request, response) => {
    const userId = request.user?._id;
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id");
    if(!business) throw new ApiError(404, "Business not found");

    const payload = validate(createProductSchema, request.body);
    const product = await Product.create({ ...payload, businessId:business._id });
    return response.status(201).json(new ApiResponse(201, product, "Product created successfully"));
});

// Fetch all products
const fetchAllProducts = asyncHandler(async (request, response) => {
    // Pagination options
    const { page = 1, limit = 10 } = request.query;
    const products = await Product.paginate({}, { page, limit });
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Products not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "All products have been fetched"));
});

// Fetch all products
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

// Fetch business featured products
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
    const { productId } = request.params;
    const product = await Product.findById(productId).lean();
    if(!product) throw new ApiError(404, "Product not found");
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

module.exports = { createProduct, fetchAllProducts, fetchBusinessProducts, fetchBusinessFeaturedProducts, 
viewProduct, updateProduct, setFeaturedProduct, deleteProduct };