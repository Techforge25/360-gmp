const BusinessProfile = require("../models/businessProfileSchema");
const Community = require("../models/communityModel");
const Product = require("../models/products");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Global search
const globalSearch = asyncHandler(async (request, response) => {
    const { search = "" } = request.query;

    // Search 
    const [businesses, products, communities] = await Promise.all([
        BusinessProfile.find({ companyName:{ $regex:search, $options:"i" } })
        .limit(3).select("companyName logo").lean(),

        Product.find({ title:{ $regex:search, $options:"i" } })
        .populate({ path:"businessId", select:"-_id companyName" })
        .limit(3).select("title image pricePerUnit").lean(),

        Community.find({ name:{ $regex:search, $options:"i" } })
        .populate({ path:"businessId", select:"-_id companyName" })
        .limit(3).select("name profileImage memberCount").lean(),
    ]);

    // Payload
    const payload = { businesses, products, communities };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Global search result have been fetched"));
});

module.exports = { globalSearch };