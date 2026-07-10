const { emptyList } = require("../constants");
const BusinessProfile = require("../models/businessProfileSchema");
const JobApplication = require("../models/jobApplication");
const Job = require("../models/jobsSchema");
const Order = require("../models/orders");
const Product = require("../models/products");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const convertToMongoId = require("../utils/convertToMongoId");
const { getBusinessProfile } = require("../utils/getProfiles");
const validate = require("../utils/validate");
const { updateBannerValidator, updateLogoValidator } = require("../validations/businessProfileManagementValidator");
const { updateBusinessContactValidator } = require("../validations/updateBusinessContactValidator");

// Fetch my products
const fetchMyProducts = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find business profile
    const businessProfile = await getBusinessProfile(userId);
    if (!businessProfile) throw new ApiError(404, "Business profile not found");

    // Base search filter
    const searchFilter = { businessId:businessProfile._id };

    // Get filter from frontend
    const { page = 1, limit = 10, filter, category, search } = request.query;
    if(filter) 
    {
        const allowedFilters = ["pending", "approved", "rejected", "draft"];
        if(!allowedFilters.includes(filter)) throw new ApiError(400, `Invalid filter! No filter found such as ${filter}`);
        searchFilter.status = filter;
    }

    if(category) searchFilter.category = category;
    if(search) searchFilter.title = { $regex: search, $options:"i" };

    // Aggregation
    const aggregate = Product.aggregate([
        { $match:searchFilter },
        {
            $addFields: {
                stockFlag: {
                    $cond: [
                        { $lte: ["$stockQty", 0] },
                        "out-of-stock",
                        {
                            $cond: [
                                { $lte: ["$stockQty", "$lowStockThreshold"] },
                                "critical-threshold",
                                "in-stock"
                            ]
                        }
                    ]
                }
            }
        },

        // Sort
        { $sort:{ createdAt:-1 } }
    ]);

    // Execute query
    const products = await Product.aggregatePaginate(aggregate, { page, limit });

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Products fetched successfully"));
});

// Fetch in stock products (stockQty > lowStockThreshold)
const fetchInStockProducts = asyncHandler(async (request, response) => {
    const userId = request.user?._id;

    // Find business
    const business = await BusinessProfile.findOne({ ownerUserId: userId }).select("_id");
    if(!business) throw new ApiError(404, "Business not found");

    // Base search filter (stock greater than threshold)
    const searchFilter = {
        businessId: business._id,
        $expr: { $gt:["$stockQty", "$lowStockThreshold"] }
    };

    // Optional status filter from frontend
    const { filter } = request.query;
    if (filter) 
    {
        const allowedFilters = ["pending", "approved", "rejected", "draft"];
        if(!allowedFilters.includes(filter)) throw new ApiError(400, `Invalid filter! No filter found such as ${filter}`);
        searchFilter.status = filter;
    }

    // Pagination options
    const { page = 1, limit = 10 } = request.query;
    const products = await Product.paginate(searchFilter, { page, limit });

    // Empty response
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No in-stock products found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "In-stock products have been fetched"));
});

// Fetch low stock products for business (Critical)
const fetchLowStockProducts = asyncHandler(async (request, response) => {
    const userId = request.user?._id;

    // Find business
    const business = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id");
    if(!business) throw new ApiError(404, "Business not found");

    // Base search filter (low stock products)
    const searchFilter = {
        businessId: business._id,
        status: "approved",
        $expr: { $lte: ["$stockQty", "$lowStockThreshold"] },
        stockQty: { $gt: 0 } // 0 stock will be considered as out of stock
    };

    // Pagination options
    const { page = 1, limit = 10 } = request.query;
    const products = await Product.paginate(searchFilter, { page, limit,
        sort: { stockQty:1 }, // most critical first
        lean: true
    });

    // Empty response
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No low stock products found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Low stock products have been fetched"));
});

// Fetch out of stock products (stockQty = 0)
const fetchOutOfStockProducts = asyncHandler(async (request, response) => {
    const userId = request.user?._id;

    // Find business
    const business = await BusinessProfile.findOne({ ownerUserId: userId }).select("_id");
    if(!business) throw new ApiError(404, "Business not found");

    // Base search filter (stock = 0)
    const searchFilter = {
        businessId: business._id,
        stockQty:0
    };

    // Optional status filter from frontend
    const { filter } = request.query;
    if (filter) 
    {
        const allowedFilters = ["pending", "approved", "rejected", "draft"];
        if(!allowedFilters.includes(filter)) throw new ApiError(400, `Invalid filter! No filter found such as ${filter}`);
        searchFilter.status = filter;
    }

    // Pagination options
    const { page = 1, limit = 10 } = request.query;
    const products = await Product.paginate(searchFilter, { page, limit });

    // Empty response
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No out-of-stock products found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Out-of-stock products have been fetched"));
});

// Top performing products
const topPerformingProducts = asyncHandler(async (request, response) => {
    // Get the current user's business profile
    const businessProfile = await getBusinessProfile(request.user._id);
    if (!businessProfile) throw new ApiError(404, "Business profile not found");

    // Aggregate orders to calculate top performing products
    const products = await Order.aggregate([
        // Match orders belonging to this business
        { $match: { sellerBusinessId: businessProfile._id } },

        // Unwind items array to process each product individually
        { $unwind: "$items" },

        // Lookup product details from Product collection
        {
            $lookup: {
                from: "products",
                localField: "items.productId",
                foreignField: "_id",
                as: "productInfo"
            }
        },
        { $unwind: "$productInfo" }, // Flatten the array returned by $lookup

        // Group by productId to calculate total quantity sold and total revenue
        {
            $group: {
                _id: "$items.productId",
                title: { $first: "$productInfo.title" },        // Product title
                totalSoldQty: { $sum: "$items.quantity" },      // Total quantity sold
                totalRevenue: { $sum: { $multiply: ["$items.quantity", "$items.priceAtPurchase"] } } // Total revenue
            }
        },

        // Sort products by totalRevenue descending
        { $sort: { totalRevenue: -1 } },

        // Limit to top 10 products (optional)
        { $limit: 10 }
    ]);

    // Return the aggregated result
    return response.status(200).json(new ApiResponse(200, { data:products, count:products.length }, "Top performing products fetched successfully"));
});

// Update map url
const updateMapURL = asyncHandler(async (request, response) => {
    // Get business profile
    const businessProfile = await BusinessProfile.findOne({ ownerUserId:request.user._id });
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Validate input
    const { mapURL } = request.body;
    if(!mapURL) throw new ApiError(400, "mapURL is required");

    // Update and save
    businessProfile.mapURL = mapURL || businessProfile.mapURL;
    await businessProfile.save();

    // Response
    return response.status(200).json(new ApiResponse(200, mapURL, "Map URL updated successfully"));
});

const viewBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { businessProfileId } = request.params;

    const [business] = await BusinessProfile.aggregate([
        { $match: { _id: convertToMongoId(businessProfileId) } },

        // Lookup testimonial
        {
            $lookup: {
                from: "testimonials",
                let: { businessId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$businessProfileId", "$$businessId"] },
                                    // { $eq: ["$status", "approved"] }
                                ]
                            }
                        }
                    }
                ],
                as: "reviews"
            }
        },

        // Add fields
        {
            $addFields: {
                averageRating: { $ifNull: [{ $avg: "$reviews.rating" }, 0] },
                totalReviews: { $size: "$reviews" }
            }
        },

        // Projection
        { $project: { reviews: 0, __v:0, updatedAt:0 } }
    ]);
    if(!business) throw new ApiError(404, "Business profile not found");

    // Update views (exclude owner + duplicate views)
    await BusinessProfile.findOneAndUpdate(
        {
            _id: businessProfileId,
            ownerUserId: { $ne: userId },
            "viewedBy.userId": { $ne: userId }
        },
        {
            $push: { viewedBy: { userId, viewedAt: new Date() } },
            $inc: { viewsCount: 1 }
        }
    );

    // Response
    return response.status(200).json(new ApiResponse(200, business, "Business profile viewed"));
});

// fetch view counts
const fetchViewCounts = asyncHandler(async (request, response) => {
    // Get business profile
    const businessProfile = await BusinessProfile.findOne({ ownerUserId: request.user._id });
    if (!businessProfile) throw new ApiError(404, "Business profile not found");

    // Get views count
    const viewsCount = Number(businessProfile.viewsCount) || 0;

    // Response
    return response.status(200).json(new ApiResponse(200, viewsCount, "View count fetched successfully"));
});

// Update business contact information
const updateContactInfo = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};
    if(!businessProfileId) throw new ApiError(400, "Business profile ID is missing");

    // Validate input
    const { primaryContactPerson, website, headOffice } = validate(updateBusinessContactValidator, request.body) || {}; 

    // Destructure
    const { phone, supportEmail } = primaryContactPerson;
    const { country, city, addressLine } = headOffice;

    // Update
    const businessProfile = await BusinessProfile.findByIdAndUpdate(
        businessProfileId,
        { 
            $set: { "primaryContactPerson.phone": phone, 
                "primaryContactPerson.supportEmail": supportEmail, 
                website, 
                "headOffice.country": country,
                "headOffice.city": city,
                "headOffice.addressLine": addressLine,
            } 
        },
        { new:true, runValidators:true }
    );
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, { primaryContactPerson, website, headOffice }, "Contact information updated successfully"));
});

// Fetch recent job applicants
const fetchRecentJobApplications = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find business profile
    const businessProfile = await getBusinessProfile(userId);
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Find latest open job
    const job = await Job.findOne({ businessId:businessProfile._id, status:"open" })
    .select("_id").sort("-createdAt").lean();
    if(!job) return response.status(200).json(new ApiResponse(200, null, "No recent job applicants found"));

    // Find job applicants (Who applied for this job)
    const jobApplications = await JobApplication.find({ jobId:job._id, status:"pending" })
    .populate({ path:"userProfileId", select:"fullName" })
    .sort("-createdAt").limit(5).select("-__v -updatedAt").lean();

    // Validate job applications
    if(!jobApplications.length) return response.status(200).json(new ApiResponse(200, [], "No recent job applicants found"));

    // Response
    return response.status(200).json(new ApiResponse(200, jobApplications, "Recent job applicants have been fetched"));
});

// Fetch closed leads (completed deals count)
const fetchNewLeads = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { range = "7d" } = request.query; // 7d | 1m | 3m

    // Find business profile
    const businessProfile = await getBusinessProfile(userId);
    if (!businessProfile) throw new ApiError(404, "Business profile not found");

    // Base filter
    const filter = {
        sellerBusinessId: businessProfile._id,
        status: "completed"
    };

    // Range = days mapping
    const rangeMap = {
        "7d": 7,
        "1m": 30,
        "3m": 90
    };

    if(range && rangeMap[range]) 
    {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - rangeMap[range]);
        filter.createdAt = { $gte:fromDate };
    }

    // Count completed orders (closed leads)
    const totalLeads = await Order.countDocuments(filter);

    // Response
    return response.status(200).json(new ApiResponse(200, totalLeads || 0, "Leads count fetched successfully"));
});

// Fetch all jobs posted by this business
const fetchMyJobs = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    
    // Find business profile
    const businessProfile = await BusinessProfile.findOne({ ownerUserId:userId }).select("_id").lean();
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Get my jobs
    const jobs = await Job.find({ businessId:businessProfile._id }).lean();

    // Response
    return response.status(200).json(new ApiResponse(200, jobs, "Jobs have been fetched"));
});

// Count total views on jobs posted by this business
const countTotalJobViews = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find business profile
    const businessProfile = await getBusinessProfile(userId);
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Aggregate total views
    const result = await Job.aggregate([
        { 
            $match: { businessId:businessProfile._id } 
        },
        {
            $group: {
                _id: null,
                totalViews: { $sum: "$viewsCount" }
            }
        }
    ]);

    // Count
    const totalViews = result.length ? result[0].totalViews : 0;

    // Response
    return response.status(200).json(new ApiResponse(200, totalViews, "Total job views fetched successfully"));
});

// Count total job applications for business
const countTotalJobApplications = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find business profile
    const businessProfile = await getBusinessProfile(userId);
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Find all jobs posted by this business
    const jobs = await Job.find({ businessId:businessProfile._id }).select("_id").lean();

    // Catch all job ids
    const jobIds = jobs.map(job => job._id);
    if(!jobIds.length) return response.status(200).json(new ApiResponse(200, 0, "No job applications found"));

    // Count all applications submitted to these jobs
    const totalApplications = await JobApplication.countDocuments({ jobId: { $in:jobIds }});

    // Response
    return response.status(200).json(new ApiResponse(200, totalApplications, "Total job applications fetched successfully"));
});

// Count total hired applicants
const countTotalHiredApplicants = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find business profile
    const businessProfile = await getBusinessProfile(userId);
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Find all jobs posted by this business
    const jobs = await Job.find({ businessId:businessProfile._id }).select("_id").lean();

    // Catch all job ids
    const jobIds = jobs.map(job => job._id);
    if(!jobIds.length) return response.status(200).json(new ApiResponse(200, 0, "No job applications found"));

    // Count all applications submitted to these jobs
    const totalHired = await JobApplication.countDocuments({ jobId:{ $in:jobIds }, status:"hired" });

    // Response
    return response.status(200).json(new ApiResponse(200, totalHired, "Total hired applicants fetched successfully"));
});

// Count total applicants that are currently in interview process
const countTotalInterviewApplicants = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find business profile
    const businessProfile = await getBusinessProfile(userId);
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Find all jobs posted by this business
    const jobs = await Job.find({ businessId:businessProfile._id }).select("_id").lean();

    // Catch all job ids
    const jobIds = jobs.map(job => job._id);
    if(!jobIds.length) return response.status(200).json(new ApiResponse(200, 0, "No job applications found"));

    // Count all applications submitted to these jobs
    const totalInterviewApplicants = await JobApplication.countDocuments({ jobId:{ $in:jobIds }, status:"interview" });

    // Response
    return response.status(200).json(new ApiResponse(200, totalInterviewApplicants, "Total interviewed applicants fetched successfully"));
});

// Count conversion rate
const countConversionRate = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { range = "7d" } = request.query; // optional

    // Find business profile
    const businessProfile = await getBusinessProfile(userId);
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Total views
    const totalViews = Number(businessProfile.viewsCount) || 0;

    // If no views, conversion rate is 0
    if(totalViews === 0) return response.status(200).json(new ApiResponse(200, 0, "Conversion rate fetched successfully"));
    

    // Base filter for leads
    const filter = {
        sellerBusinessId: businessProfile._id,
        status: "completed"
    };

    // Range = days mapping (no switch)
    const rangeMap = {
        "7d": 7,
        "1m": 30,
        "3m": 90
    };

    if(range && rangeMap[range]) 
    {
        const fromDate = new Date();
        fromDate.setDate(fromDate.getDate() - rangeMap[range]);
        filter.createdAt = { $gte:fromDate };
    }

    // Count closed leads
    const totalLeads = await Order.countDocuments(filter);

    // Conversion rate calculation
    const conversionRate = Number(((totalLeads / totalViews) * 100).toFixed(2));

    // Response
    return response.status(200).json(new ApiResponse(200, conversionRate, "Conversion rate fetched successfully"));
});

// Update logo
const updateBusinessLogo = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Get validated payload
    const { logo } = validate(updateLogoValidator, request.body);
    
    // Save
    const business = await BusinessProfile.findByIdAndUpdate(businessProfileId, { $set:{ logo } }, { new:true, lean:true })
    .select("-_id logo");
    if(!business) throw new ApiError(400, "Failed to update logo");

    // Response
    return response.status(200).json(new ApiResponse(200, business, "Logo has been updated"));
});

// Update banner
const updateBusinessBanner = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Get validated payload
    const { banner } = validate(updateBannerValidator, request.body);
    
    // Save
    const business = await BusinessProfile.findByIdAndUpdate(businessProfileId, { $set:{ banner } }, { new:true, lean:true })
    .select("-_id banner");
    if(!business) throw new ApiError(400, "Failed to update banner");

    // Response
    return response.status(200).json(new ApiResponse(200, business, "Banner has been updated"));
});

module.exports = { fetchMyProducts, topPerformingProducts, updateMapURL, viewBusinessProfile,
fetchViewCounts, updateContactInfo, fetchLowStockProducts, fetchRecentJobApplications, fetchNewLeads,
countTotalJobApplications, countTotalHiredApplicants, countTotalInterviewApplicants, countConversionRate,
fetchInStockProducts, fetchOutOfStockProducts, countTotalJobViews, fetchMyJobs, updateBusinessBanner,
updateBusinessLogo };