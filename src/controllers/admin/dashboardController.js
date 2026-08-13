const { isValidObjectId } = require("mongoose");
const { emptyList } = require("../../constants");
const BusinessProfile = require("../../models/businessProfileSchema");
const Subscription = require("../../models/subscription");
const SubscriptionHistory = require("../../models/subscriptionHistoryModel");
const UserProfile = require("../../models/userProfile");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const convertToMongoId = require("../../utils/convertToMongoId");

// Initiator
const dashboardInitiator = asyncHandler(async (request, response) => {
    // Response
    return response.status(200).json(new ApiResponse(200, { hasAccess: true }, "Initiate Dashboard Module"));
});

// Fetch dashboard stats
const fetchDashboardStats = asyncHandler(async (request, response) => {

    const [[platformRevenue], totalUserProfiles, totalBusinessProfiles] = await Promise.all([
        // Platform revvenue
        SubscriptionHistory.aggregate([
            // Group by invoiceId
            {
                $group: {
                    _id: "$invoiceId",
                    planId: { $first: "$planId" }
                }
            },

            // Lookup plan
            {
                $lookup: {
                    from: "plans",
                    localField: "planId",
                    foreignField: "_id",
                    as: "plan",
                    pipeline: [{ $project: { _id: 0, price: 1 } }]
                }
            },

            { $unwind: "$plan" },

            // Sum all unique invoices
            {
                $group: {
                    _id: null,
                    totalAmount: { $sum: "$plan.price" }
                }
            },
        ]),

        // Total user profiles
        UserProfile.countDocuments({}),

        // Total business profiles
        BusinessProfile.countDocuments({ status: "approved" })        
    ]);

    // Prepare payload
    const payload = {
        totalPlatformRevenue: Number(platformRevenue?.totalAmount?.toFixed(2)) || 0,
        totalUserProfiles,
        totalBusinessProfiles
    };

    // Response
    return response.status(200).json(new ApiResponse(200, payload, "Dashboard stats have been fetched"));
});

// Fetch latest businesses
const fetchLatestBusinesses = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10 } = request.query;

    // Fetch
    const businesses = await BusinessProfile.aggregatePaginate([
        // Match
        { $match: { status: "pending" } },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        { $project: { companyName: 1, createdAt: 1 } }
    ], { page, limit });
    if(!businesses.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No latest businesses found"));

    // Response
    return response.status(200).json(new ApiResponse(200, businesses, "Latest business profiles have been fetched"));
});

// View latest business profile
const viewLatestBusinessProfile = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { businessProfileId } = request.params;
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid Business Profile ID");

    // Fetch
    const [businessProfile] = await BusinessProfile.aggregate([
        // Match
        { $match: { _id: convertToMongoId(businessProfileId), status: "pending" } },

        // Projection
        {
            $project: {
                companyName: 1,
                businessType: 1,
                companySize: 1,
                primaryIndustry: 1,
                countryOfRegistration: 1,
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
                ownedByAnotherCompany: 1,
                parentCompany: 1,
                primaryContactPerson: 1,
                operationalAndTradeProfile: 1,
                amlAndTransactionProfile: 1,
                certificateOfIncorporation: 1,
                taxRegistrationCertificate: 1,
                shareHolderRegister: 1,
                operatingLicense: 1,
                evidenceOfFunds: 1,
                status: 1
            }
        }
    ]);
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfile, "Business profile has been fetched"));
});

module.exports = { dashboardInitiator, fetchDashboardStats, fetchLatestBusinesses, 
viewLatestBusinessProfile };