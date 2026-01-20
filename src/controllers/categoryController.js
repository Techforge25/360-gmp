const Category = require("../models/categoryModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Create category
const createCategory = asyncHandler(async (request, response) => {
    const { title, description } = request.body;

    // Validate
    if(!title) throw new ApiError(400, "Title is required");

    // Save to db
    const category = await Category.create({ title, description });
    if(!category) throw new ApiError(500, "Failed to create category");

    // Response
    return response.status(201).json(new ApiResponse(201, category, "New category has been created"));
});

// Create category
const fetchAllCategories = asyncHandler(async (request, response) => {  
    // Find
    const categories = await Category.find({}).select("title");

    // Response
    return response.status(200).json(new ApiResponse(200, categories, "Categories have been fetched"));
});

module.exports = { createCategory, fetchAllCategories };