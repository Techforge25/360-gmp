const BusinessProfile = require("../models/businessProfileSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { createBusinessProfileSchema } = require("../validations/businessProfileVaidator");
const User = require("../models/users");
const Wallet = require("../models/walletModel");
const { emptyList } = require("../constants");
const { isValidObjectId } = require("mongoose");
const Job = require("../models/jobsSchema");
const Product = require("../models/products");
const Community = require("../models/communityModel");
const sendNotification = require("../utils/sendNotification");
const convertToMongoId = require("../utils/convertToMongoId");
const validate = require("../utils/validate");

// Create business
const createBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Get validated payload Validate
    const data = validate(createBusinessProfileSchema, request.body) || {};

    // Check if user has already created BusinessProfile
    const [existingProfile, existingName] = await Promise.all([
        BusinessProfile.findOne({ ownerUserId:userId }).select("_id").lean(),
        BusinessProfile.findOne({ companyName: data.companyName }).select("companyName").lean(),
    ]);
    if(existingProfile) throw new ApiError(400, "You have already created a business profile");
    if(existingName) throw new ApiError(400, "This Company name has already been taken");

    // Prepare profile payload
    const profileData = { ...data, ownerUserId: userId };

    // Create profile
    const profile = await BusinessProfile.create(profileData);
    if(!profile) throw new ApiError(500, "Failed to create business profile");

    // Create wallet account, set role from null to business and mark "isNewToPlatform" as false
    const [wallet, user] = await Promise.all([
        Wallet.create({ 
            ownerId: profile._id, ownerModel: "BusinessProfile", 
            pendingBalance: 0, availableBalance: 0, totalEarned: 0, currency: 'USD' 
        }),
        User.findByIdAndUpdate(userId, { role: "business", isNewToPlatform: false }, { new: true, lean: true })
    ]);

    // Validate
    if(!wallet) throw new ApiError(500, "Failed to setup wallet account business");
    if(!user) throw new ApiError(500, "Failed to update user status upon business profile creation");

    // Send notification to business
    await sendNotification({ 
        userId,
        type: "BusinessProfile",
        title: "Business Profile Created",
        content: "Your business profile has been successfully set up.",
        io: request.app.get("io")
    });

    // Response
    return response.status(201).json(new ApiResponse(201, { profile, isNewToPlatform: user.isNewToPlatform }, "Business profile has been created"));
});

// Fetch business profiles
const fetchBusinessProfiles = asyncHandler(async (request, response) => {
    const { page = 1, limit = 10, search, industry, country, city, businessType, rating } = request.query;

    // Validate rating filter
    if(rating && (rating > 5 || rating < 1)) throw new ApiError(400, "Invalid rating value");

    // Filters
    const filter = {};
    if(search) filter.companyName = { $regex:search, $options:"i" };
    if(industry) filter.primaryIndustry = { $regex:industry, $options:"i" };
    if(country) filter["headOffice.country"] = { $regex: country, $options: "i" };
    if(city) filter["headOffice.city"] = { $regex: city, $options: "i" };
    if(businessType) filter.businessType = { $regex: businessType, $options: "i" };    

    // Fetch business profiles
    const businessProfiles = await BusinessProfile.aggregatePaginate([
        // Match
        { $match: filter },

        // Lookup testimonials
        {
            $lookup: {
                from: "testimonials",
                localField: "_id",
                foreignField: "businessProfileId",
                as: "testimonials"
            }
        },

        // Add average rating and total reviews fields
        {
            $addFields: {
                totalReviews: {
                    $size: {
                        $ifNull: ["$testimonials", []]
                    }
                },
                averageRating: {
                    $cond: {
                        if: { $gt: [{ $size: "$testimonials" }, 0] },
                        then: { $avg: "$testimonials.rating" },
                        else: 0
                    }
                }
            }
        },

        // Round rating
        {
            $addFields: {
                averageRating: { $round: ["$averageRating", 1] }
            }
        },

        // Filter by rating
        ...(rating ? [{ $match: { averageRating: { $gte: Number(rating) } } }] : []),     

        // Existing product lookup
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "businessId",
                as: "products"
            }
        },

        {
            $addFields: {
                totalProducts: {
                    $cond: {
                        if: { $isArray: "$products" },
                        then: { $size: "$products" },
                        else: 0
                    }
                }
            }
        },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        { 
            $project: { 
                logo: 1,
                banner: 1,
                companyName: 1, 
                totalReviews: 1, 
                averageRating: 1, 
                businessType: 1, 
                foundedDate: 1,
                headOffice: 1,  
                operationHour: 1, 
                companySize: 1, 
                totalProducts: 1, 
                website:1, 
                mapURL: 1, 
                latitude:1, 
                longitude: 1, 
                phone: "$primaryContactPerson.phone",
                description: 1
            } 
        },
    ], { page, limit });
    if(!businessProfiles.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No business profiles found"));

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

// Fetch my rejected business profile
const fetchMyRejectedBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Fetch 
    const [business] = await BusinessProfile.aggregate([
        // Match
        { $match: { ownerUserId: convertToMongoId(userId) } },

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
                status: 1,
                rejection: { 
                    rejectedAt: "$rejection.rejectedAt",
                    note: "$rejection.note",
                }
            }
        }        
    ]);
    if(!business) throw new ApiError(404, "No business profile found");
    if(business.status !== "rejected") throw new ApiError(400, "Your business profile is not currently in a rejected state");

    // Response
    return response.status(200).json(new ApiResponse(200, business, "Rejected business profile has been fetched"));
});

// Re-submit business profile
const resubmitBusinessProfile = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Fetch and validate
    const business = await BusinessProfile.findOne({ ownerUserId: userId }).select("_id status").lean();
    if(!business) throw new ApiError(404, "Business profile not found");
    if(business.status !== "rejected") throw new ApiError(403, "You cannot resubmit your business profile unless it is in a rejected state");

    // Get validated payload
    const data = validate(createBusinessProfileSchema, request.body) || {};

    // Update
    const submit = await BusinessProfile.findByIdAndUpdate(business._id, { ...data, status: "pending" });
    if(!submit) throw new ApiError(400, "Failed to re-submit business profile");

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Business profile has been re-submitted"));
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
    const business = await BusinessProfile.find({}).limit(10).sort("-createdAt").lean();

    // Response
    return response.status(200).json(new ApiResponse(200, business, "Latest Business has been fetched successfully"));
});

// Fetch country of registered business
const fetchBusinessCountries = asyncHandler(async (request, response) => {
    // Get unique countries
    const countries = await BusinessProfile.distinct("headOffice.country", {});

    // Response
    return response.status(200).json(new ApiResponse(200, countries, "Business countries have been fetched successfully"));
});

/******************** BUSINESS RESOURCES ********************/
// Fetch all business products (Shown on business profile)
const fetchBusinessProducts = asyncHandler(async (request, response) => {
    const { businessId } = request.params;
    if(!isValidObjectId(businessId)) throw new ApiError(400, "Invalid business ID");

    // Pagination options
    const { page = 1, limit = 10 } = request.query;    

    // Aggregate pipeline
    const products = await Product.aggregatePaginate([
        { $match: { businessId: convertToMongoId(businessId) } },

        // Join reviews
        {
            $lookup: {
                from: "productreviews",
                localField: "_id",
                foreignField: "productId",
                as: "reviews"
            }
        },

        // Lookup business
        {
            $lookup:{
                from: "businessprofiles",
                localField: "businessId",
                foreignField: "_id",
                as: "businessId",
                pipeline:[
                    { $project:{ companyName: 1, logo: 1, isVerified: 1 } }
                ]
            }
        },

        // Lookup order
        {
            $lookup:{
                from: "orders",
                let: { productId: "$_id" },
                pipeline: [
                    { $match: { status: "completed" } },
                    {
                        $match: {
                            $expr: {
                                $in: ["$$productId", "$items.productId"]
                            }
                        }
                    }
                ],
                as:"orders"
            }
        },

        // Unwind
        { $unwind:{ path:"$businessId", preserveNullAndEmptyArrays:true } },

        // Add totalReviews and avgRating
        {
            $addFields: {
                totalReviews: { $size: "$reviews" },
                avgRating: { $avg: "$reviews.rating" },
                sold: {
                    $sum: {
                        $map: {
                            input: "$orders",
                            as: "order",
                            in: {
                                $sum: {
                                    $map: {
                                        input: {
                                            $filter: {
                                                input: "$$order.items",
                                                as: "item",
                                                cond: {
                                                    $eq: ["$$item.productId", "$_id"]
                                                }
                                            }
                                        },
                                        as: "matchedItem",
                                        in: "$$matchedItem.quantity"
                                    }
                                }
                            }
                        }
                    }
                }
            }
        },

        // Default 0 if no reviews
        {
            $addFields: {
                avgRating: { $ifNull: ["$avgRating", 0] }
            }
        },

        // Round rating
        {
            $addFields: {
                avgRating: { $round: ["$avgRating", 1] }
            }
        },              

        // Sort by avgRating then totalReviews
        {
            $sort: { createdAt: -1 }
        },

        // Projection
        { 
            $project: { 
                businessId:"$businessId", 
                image: 1, 
                title: 1, 
                minOrderQty: 1, 
                pricePerUnit: 1, 
                sold: 1, 
                avgRating: 1 
            } 
        }
    ], { page, limit });    
    if(!products.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "Business products not found"));

    // Response
    return response.status(200).json(new ApiResponse(200, products, "Business products have been fetched"));
});

// Fetch all business jobs
const fetchBusinessJobs = asyncHandler(async (request, response) => {
    const { businessId } = request.params;
    if(!isValidObjectId(businessId)) throw new ApiError(400, "Invalid business ID");

    // Pagination options
    const { page = 1, limit = 10 } = request.query;
    const jobs = await Job.paginate({ businessId }, { page, limit });
    if(!jobs.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No business jobs found"));

    // Response
    return response.status(200).json(new ApiResponse(200, jobs, "Business jobs have been fetched"));
});

// Fetch all business communities
const fetchBusinessCommunities = asyncHandler(async (request, response) => {
    const { businessId } = request.params;
    if(!isValidObjectId(businessId)) throw new ApiError(400, "Invalid business ID");

    // Pagination
    const { page = 1, limit = 10 } = request.query;

    // Options
    const options = {
        page: Number(page),
        limit: Number(limit),
        select: "-__v -updatedAt -postingPermissions -colorHashcode -rules -industry -purpose -bannerTagLine",
        sort:{ createdAt:-1 },
    };

    const communities = await Community.paginate({ businessId }, options);
    if(!communities.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No business communities found"));

    // Response
    return response.status(200).json(new ApiResponse(200, communities, "Business communities have been fetched"));
});


module.exports = { createBusinessProfile, fetchBusinessProfiles, fetchMyBusinessProfile, 
deleteMyBusinessProfile, getDirection, fetchLatestBusiness, fetchBusinessCountries, fetchBusinessJobs, 
fetchBusinessProducts, fetchBusinessCommunities, fetchMyRejectedBusinessProfile, resubmitBusinessProfile };