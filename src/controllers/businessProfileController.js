const BusinessProfile = require("../models/businessProfileSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createBusinessProfileSchema, updateBusinessProfileSchema } = require("../validations/businessProfileVaidator");
const User = require("../models/users");
const Wallet = require("../models/walletModel");
const { emptyList } = require("../constants");

// Create business
const createBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Validate
    const { error, value } = createBusinessProfileSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Check if user has already created BusinessProfile
    const [existingProfile, existingName] = await Promise.all([
        BusinessProfile.findOne({ ownerUserId:userId }).select("_id").lean(),
        BusinessProfile.findOne({ companyName:value.companyName }).select("companyName").lean(),
    ]);
    if(existingProfile) throw new ApiError(400, "You have already created a business profile");
    if(existingName) throw new ApiError(400, "This Company name has already been taken");

    // Prepare profile payload
    const profileData = { ...value, ownerUserId:userId };

    // Create profile
    const profile = await BusinessProfile.create(profileData);
    if(!profile) throw new ApiError(500, "Failed to create business profile");

    // Create wallet account, set role from null to business and mark "isNewToPlatform" as false
    const [wallet, user] = await Promise.all([
        Wallet.create({ 
            ownerId:profile._id, ownerModel:"BusinessProfile", 
            pendingBalance:0, availableBalance:0, totalEarned:0, currency:'USD' 
        }),
        User.findByIdAndUpdate(userId, { role:"business", isNewToPlatform:false }, { new:true, lean:true })
    ]);

    // Validate
    if(!wallet) throw new ApiError(500, "Failed to setup wallet account business");
    if(!user) throw new ApiError(500, "Failed to update user status upon business profile creation");

    // Response
    return response.status(201).json(new ApiResponse(201, { profile, isNewToPlatform:user.isNewToPlatform }, "Business profile has been created"));
});

// // Fetch business profiles
// const fetchBusinessProfiles = asyncHandler(async (request, response) => {
//     const { page = 1, limit = 10, search, industry, country, city, businessType } = request.query;

//     // Filters
//     const filter = {};
//     if(search) filter.companyName = { $regex:search, $options:"i" };
//     if(industry) filter.primaryIndustry = { $regex:industry, $options:"i" };
//     if(country) filter["location.country"] = { $regex: country, $options: "i" };
//     if(city) filter["location.city"] = { $regex: city, $options: "i" };
//     if(businessType) filter.businessType = { $regex: businessType, $options: "i" };

//     // Fetch
//     const profiles = await BusinessProfile.paginate(filter, { page, limit, sort:{ createdAt:-1 } });
//     if(!profiles.docs?.length) return response.status(200).json(new ApiResponse(200, profiles, "No business profiles found"));

//     // Response
//     return response.status(200).json(new ApiResponse(200, profiles, "Business profiles fetched successfully"));
// });

// Fetch business profiles
const fetchBusinessProfiles = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search, industry, country, city, businessType } = request.query;

    // Filters
    const filter = {};
    if(search) filter.companyName = { $regex:search, $options:"i" };
    if(industry) filter.primaryIndustry = { $regex:industry, $options:"i" };
    if(country) filter["location.country"] = { $regex: country, $options: "i" };
    if(city) filter["location.city"] = { $regex: city, $options: "i" };
    if(businessType) filter.businessType = { $regex: businessType, $options: "i" };

    // Aggregation pipeline
    const aggregation = BusinessProfile.aggregate([
        // Match
        { $match:filter },

        // Lookup inside products
        {
            $lookup:{
                from:"products",
                localField: "_id",
                foreignField: "businessId",
                as:"products"
            }
        },

        { $unwind:{ path:"$products", preserveNullAndEmptyArrays:true } },

        {
            $addFields:{
                totalProducts: { $cond:{ if:{ $isArray:"$products" }, then:{ $size:"$products" }, else:0 } }
            }
        },

        // Sort
        { $sort:{ createdAt:-1 } },

    ]);

    // Execute query
    const businessProfiles = await BusinessProfile.aggregatePaginate(aggregation, { page, limit });
    if(!businessProfiles.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No business profiles found"));

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfiles, "Business profiles fetched successfully"));
});

// Fetch my business
const fetchMyBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get business
    const businessProfile = await BusinessProfile.findOne({ ownerUserId:userId }).select("-updatedAt -__v").lean();
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfile, "Business profile has been fetched successfully"));
});

const updateBusinessProfile = asyncHandler(async (request, response) => {
    // Validate
    const { error, value } = updateBusinessProfileSchema.validate(request.body, { abortEarly: false });
    if(error) throw new ApiError(400, error.details.map(err => err.message).join(", "));

    // Find and update profile
    const profile = await BusinessProfile.findOneAndUpdate(
        { ownerUserId: request.user._id },
        { $set: value },
        { new: true, runValidators: true }
    );
    if(!profile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, profile, "Business profile has been updated"));
});

// Delete my business profile
const deleteMyBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get business
    const businessProfile = await BusinessProfile.findOneAndDelete({ ownerUserId:userId }).select("_id").lean();
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfile, "Business profile has been deleted successfully"));
});

// Get direction
const getDirection = asyncHandler(async (request, response) => {
    const { businessId } = request.params;

    // Find business profile
    const businessProfile = await BusinessProfile.findById(businessId).select("-_id location").lean();
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfile, "Location has been fetched"));
});

// Fetch latest business for market place
const fetchLatestBusiness = asyncHandler(async (request, response) => {
    // Get business
    const business = await BusinessProfile.find({}).limit(10).lean();

    // Response
    return response.status(200).json(new ApiResponse(200, business, "Latest Business has been fetched successfully"));
});

// Fetch country of registered business
const fetchBusinessCountries = asyncHandler(async (request, response) => {
    // Get unique countries
    const countries = await BusinessProfile.distinct("location.country", {});

    // Response
    return response.status(200).json(new ApiResponse(200, countries, "Business countries have been fetched successfully"));
});


module.exports = { createBusinessProfile, fetchBusinessProfiles, fetchMyBusinessProfile, 
updateBusinessProfile, deleteMyBusinessProfile, getDirection, fetchLatestBusiness, fetchBusinessCountries };