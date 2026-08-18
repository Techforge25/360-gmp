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
const Plan = require("../../models/plan");

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
            // Match
            { $match: { status: { $in: ["paid", "canceled"] } } },

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

// Fetch subscription based chart
const fetchSubscriptionChart = asyncHandler(async (request, response) => {
    // Total subscriptions
    const totalSubscriptions = await Subscription.countDocuments({});

    // Aggregate plan counts
    const subscriptions = await Subscription.aggregate([
        {
            $group: {
                _id: "$planId",
                total: { $sum: 1 }
            }
        },

        // Lookup plan
        {
            $lookup: {
                from: "plans",
                localField: "_id",
                foreignField: "_id",
                as: "plan"
            }
        },
        { $unwind: "$plan" },

        // Projection
        { $project: { _id: 0, name: "$plan.name", total: 1 } }
    ]);

    // Fetch all plans
    const plans = await Plan.find({ name: { $ne: "Bronze" } }).select("_id name").lean();

    // Chart
    const chart = plans.map(plan => {
        const found = subscriptions.find(s => s.name === plan.name);
        const count = found ? found.total : 0;

        return {
            name: plan.name,
            count,
            percentage: totalSubscriptions === 0 ? 0 : Number(((count / totalSubscriptions) * 100).toFixed(2))
        };
    });

    /*
        Subscription Percentage = (Number of users subscribed to a specific plan ÷ Total number of subscribed users) × 100
    */

    // Response
    return response.status(200).json(new ApiResponse(200, chart, "Subscription chart has been fetched"));

});

// Fetch revenue graph
const fetchRevenueGraph = asyncHandler(async (request, response) => {

    // Calculate dates
    const currentYear = new Date().getFullYear();

    const startDate = new Date(currentYear, 0, 1);
    const endDate = new Date(currentYear + 1, 0, 1);

    const revenue = await SubscriptionHistory.aggregate([
        // Only successful payments
        {
            $match: {
                status: { $in: ["paid", "canceled"] },
                createdAt: { $gte: startDate, $lt: endDate }
            }
        },

        // Get plan
        {
            $lookup: {
                from: "plans",
                localField: "planId",
                foreignField: "_id",
                as: "plan"
            }
        },

        // Convert plan array to object
        { $unwind: "$plan" },

        // Group revenue by month
        {
            $group: {
                _id: { month: { $month: "$createdAt" } },
                earning: { $sum: "$plan.price" }
            }
        },

        // Sort January -> December
        { $sort: { "_id.month": 1 } }
    ]);

    // Month names
    const months = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "May",
        "June",
        "July",
        "Aug",
        "Sept",
        "Oct",
        "Nov",
        "Dec"
    ];

    // Create complete January -> December graph
    const revenueGraph = months.map((month, index) => {
        const found = revenue.find(item => item._id.month === index + 1);
        return {
            month,
            earning: found ? found.earning : 0
        };
    });

    // Response
    return response.status(200).json(new ApiResponse(200, revenueGraph, "Revenue graph has been fetched"));
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

module.exports = { dashboardInitiator, fetchDashboardStats, fetchSubscriptionChart, 
fetchLatestBusinesses, viewLatestBusinessProfile, fetchRevenueGraph };