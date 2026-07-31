const { isValidObjectId } = require("mongoose");
const { emptyList } = require("../../constants");
const BusinessProfile = require("../../models/businessProfileSchema");
const UserProfile = require("../../models/userProfile");
const User = require("../../models/users");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const convertToMongoId = require("../../utils/convertToMongoId");

// Allowed date filters
const allowedDateFilters = ["all", "7d", "1m", "6m", "1y"];

// Helper function to implement date range
const getDateFilter = (request) => {
    // Date filter
    const { dateRange = "all" } = request.query;
    if(!allowedDateFilters.includes(dateRange)) throw new ApiError(400, "Invalid date range");

    // Date filter
    const dateFilter = {};

    if(dateRange !== "all")
    {
        // Calculate date
        const now = new Date();
        let startDate = new Date();

        if(dateRange === "7d") startDate.setDate(now.getDate() - 7);
        if(dateRange === "1m") startDate.setMonth(now.getMonth() - 1);
        if(dateRange === "6m") startDate.setMonth(now.getMonth() - 6);
        if(dateRange === "1y") startDate.setMonth(now.getMonth() - 12);

        // Inject date range
        dateFilter.createdAt = { $gte: startDate };
    }

    return { dateFilter };
};

// Fetch account stats
const fetchAccountStats = asyncHandler(async (request, response) => {
    // Get date filter
    const { dateFilter } = getDateFilter(request);

    // Fetch
    const [totalParentUsers, totalUserProfiles, totalBusinessProfiles, pendingBusinessProfiles] = await Promise.all([
        User.countDocuments({ ...dateFilter, status: "active" }),
        UserProfile.countDocuments({ ...dateFilter }),
        BusinessProfile.countDocuments({ ...dateFilter, status: "active" }),
        BusinessProfile.countDocuments({ ...dateFilter, status: "pending" })
    ]);

    // Payload
    const payload = { totalParentUsers, totalUserProfiles, totalBusinessProfiles, pendingBusinessProfiles };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Account stats have been fetched"));
});

// Fetch user profiles
const fetchUserProfiles = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search, type } = request.query;

    // Get date filter
    const { dateFilter } = getDateFilter(request);    

    // Filters
    const baseFilter = {};
    const planFilter = {};

    if(search) baseFilter.fullName = { $regex: search, $options: "i" }; // Filter by user profile name
    if(type) planFilter.name = { $regex: type, $options: "i" }; // Filter by plan type

    // Fetch
    const userProfiles = await UserProfile.aggregatePaginate([
        // Match
        { $match: { ...dateFilter, ...baseFilter } },

        // Sort
        { $sort: { createdAt: -1 } },

        // Lookup subscription
        {
            $lookup: {
                from: "subscriptions",
                localField: "userId",
                foreignField: "userId",
                as: "subscription",
                pipeline: [
                    {
                        $lookup: {
                            from: "plans",
                            localField: "planId",
                            foreignField: "_id",
                            as: "plan",
                            pipeline:[{ $match: planFilter }]
                        }
                    },

                    // Unwind
                    { $unwind: "$plan" },   
                    
                    // Project 
                    { $project: { _id:0, subscriptionType: "$plan.name" } }
                ]
            }
        },

        // Unwind
        { $unwind: "$subscription" },

        // Projection
        {
            $project: {
                fullName: 1,
                email: 1, 
                logo: 1,
                createdAt: 1,
                subscription: 1
            }
        }
    ], { page, limit });
    if(!userProfiles.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No user profiles found"));

    // Response
    return response.status(200).json(new ApiResponse(200, userProfiles, "User profiles have been fetched"));
});

// Fetch business profiles
const fetchBusinessProfiles = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search, type, status } = request.query;

    // Validate status type
    if(status && !["pending", "approved", "rejected"].includes(status)) throw new ApiError(400, "Invalid status type");

    // Get date filter
    const { dateFilter } = getDateFilter(request);    

    // Filters
    const baseFilter = {};
    const planFilter = {};
    const statusFilter = {};

    if(search) baseFilter.companyName = { $regex: search, $options: "i" }; // Filter by company name
    if(type) planFilter.name = { $regex: type, $options: "i" }; // Filter by plan type
    if(status) statusFilter.status = status; // Filter by profile status

    // Fetch
    const businessProfiles = await BusinessProfile.aggregatePaginate([
        // Match
        { $match: { ...dateFilter, ...baseFilter, ...statusFilter } },

        // Sort
        { $sort: { createdAt: -1 } },

        // Lookup subscription
        {
            $lookup: {
                from: "subscriptions",
                localField: "ownerUserId",
                foreignField: "userId",
                as: "subscription",
                pipeline: [
                    {
                        $lookup: {
                            from: "plans",
                            localField: "planId",
                            foreignField: "_id",
                            as: "plan",
                            pipeline:[{ $match: planFilter }]
                        }
                    },

                    // Unwind
                    { $unwind: "$plan" },   
                    
                    // Project 
                    { $project: { _id:0, subscriptionType: "$plan.name" } }
                ]
            }
        },

        // Unwind
        { $unwind: "$subscription" },

        // Projection
        {
            $project: {
                companyName: 1,
                email: "$primaryContactPerson.supportEmail", 
                logo: 1,
                createdAt: 1,
                subscription: 1
            }
        }
    ], { page, limit });
    if(!businessProfiles.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No business profiles found"));

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfiles, "Business profiles have been fetched"));
});

// View user profile
const viewUserProfile = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { userProfileId } = request.params;
    if(!isValidObjectId(userProfileId)) throw new ApiError(400, "Invalid User Profile ID");

    // Fetch
    const [userProfile] = await UserProfile.aggregate([
        // Match
        { $match: { _id: convertToMongoId(userProfileId) } },

        // Lookup work experience
        {
            $lookup: {
                from: "workexperiences",
                localField: "_id",
                foreignField: "userProfileId",
                as: "workExperience",
            }
        },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        {
            $project: {
                fullName: 1,
                email: 1,
                logo: 1,
                bio: 1,
                createdAt: 1,
                location: 1,
                title: 1,
                employmentType: 1,
                education: 1,
                workExperience: 1
            }
        }
    ]);
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, userProfile, "User profile has been fetched"));
});

// View business profile
const viewBusinessProfile = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { businessProfileId } = request.params;
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid Business Profile ID");

    // Fetch
    const [businessProfile] = await BusinessProfile.aggregate([
        // Match
        { $match: { _id: convertToMongoId(businessProfileId) } },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        {
            $project: {
                companyName: 1,
                businessType: 1,
                companySize: 1,
                foundedDate: 1,
                createdAt: 1,
                ownerName: 1,
                tradeName: 1,
                businessRegistrationNumber: 1,
                taxIdentificationNumber: 1,
                dunsNumber: 1,
                operationHour: 1,
                website: 1,
                description: 1,
                logo: 1,
                headOffice: 1,
                warehouseAddress: 1,
                additionalWarehouseAddress: 1,
                internationalOffices: 1,
                incoterms: 1,
                termsAndCapability: 1,
                executiveAndLeadership: 1,
                primaryContactPerson: 1,
                operationalAndTradeProfile: 1,
                amlAndTransactionProfile: 1,
                certificateOfIncorporation: 1,
                taxRegistrationCertificate: 1,
                shareHolderRegister: 1,
                operatingLicense: 1,
                evidenceOfFunds: 1
            }
        }
    ]);
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfile, "Business profile has been fetched"));
});

module.exports = { fetchAccountStats, fetchUserProfiles, fetchBusinessProfiles, 
viewUserProfile, viewBusinessProfile };