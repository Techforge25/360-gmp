const asyncHandler = require("../utils/asyncHandler");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const UserSearch = require("../models/userSearchesModel");
const { isValidObjectId } = require("mongoose");
const { emptyList } = require("../constants");

// Create user search
const createUserSearch = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get searched content
    const { searchedContent } = request.body || {};
    if(!searchedContent) return response.status(200).json(new ApiResponse(200, null, "Searched content is empty"));

    // Save to db
    const userSearch = await UserSearch.create({ userId, searchedContent });
    if(!userSearch) throw new ApiError(500, "Failed to save user's searched content into db");

    // Response
    return response.status(201).json(new ApiResponse(201, userSearch, "User's searched content has been saved"));
});

// Fetch single user searches
const fetchSingleUserSearches = asyncHandler(async (request, response) => {
    const { userId } = request.params;
    if(!isValidObjectId(userId)) throw new ApiError(400, "Invalid Object ID for user");

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find searches
    const searches = await UserSearch.paginate({ userId }, { page, limit, lean:true, select:"-__v -updatedAt" });
    if(!searches.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No searches found"));
    
    // Response
    return response.status(200).json(new ApiResponse(200, searches, "User searches have been fetched"));
});

// Fetch my searches
const fetchMySearches = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Find searches
    const searches = await UserSearch.paginate(
        { userId }, 
        { page, limit, lean:true, select:"-userId -__v -updatedAt" }
    );
    if(!searches.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No searches found"));
    
    // Response
    return response.status(200).json(new ApiResponse(200, searches, "Your searched contents have been fetched"));
});

module.exports = { createUserSearch, fetchSingleUserSearches, fetchMySearches };