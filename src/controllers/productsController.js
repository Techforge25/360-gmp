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
    const { page = 1, limit = 10 } = request.query;
    const products = await Product.paginate({}, { page, limit });
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, [], "Products not found"));

    return response.status(200).json(new ApiResponse(200, products, "All products have been fetched"));
});

// Fetch all products
const fetchBusinessProducts = asyncHandler(async (request, response) => {
    const userId = request.user?._id;
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id");
    if(!business) throw new ApiError(404, "Business not found");    

    const { page = 1, limit = 10 } = request.query;
    const products = await Product.paginate({ businessId:business._id }, { page, limit });
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, [], "Business products not found"));

    return response.status(200).json(new ApiResponse(200, products, "Business products have been fetched"));
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

// Delete product
const deleteProduct = asyncHandler(async (request, response) => {
    const { productId } = request.params;
    const product = await Product.findByIdAndDelete(productId).lean();
    if(!product) throw new ApiError(404, "Product not found");
    return response.status(200).json(new ApiResponse(200, product, "Product has been deleted"));
});

module.exports = { createProduct, fetchAllProducts, fetchBusinessProducts, viewProduct, updateProduct, deleteProduct };