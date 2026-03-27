const Community = require("../../models/communityModel");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");

// Total communities
const totalCommunities = asyncHandler(async (request, response) => {
    const count = await Community.countDocuments();
    return response.status(200).json(new ApiResponse(200, Number(count) || 0, "Total communities count has been fetched"));
});

module.exports = { totalCommunities };