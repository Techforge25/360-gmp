const ReviewInvite = require("../models/reviewInviteModel");
const Testimonial = require("../models/testimonialModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const crypto = require("crypto");
const validate = require("../utils/validate");
const { createTestimonialValidationSchema } = require("../validations/testimonialsValidator");
const { emptyList } = require("../constants");
const sendNotification = require("../utils/sendNotification");
const { isValidObjectId } = require("mongoose");

// Create review invite
const createReviewInvite = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};
    if(!businessProfileId) throw new ApiError(400, "Business profile ID is missing");
    
    // Generate random invite token
    const inviteToken = crypto.randomBytes(20).toString("hex");
    if(!inviteToken) throw new ApiError(500, "Could not generate review invite token");

    // Save to db
    const reviewInvite = await ReviewInvite.create({ businessId:businessProfileId, inviteToken });
    if(!reviewInvite) throw new ApiError(500, "Could not create review invite");
    
    // Response
    return response.status(201).json(new ApiResponse(201, { inviteToken }, "Review invite created successfully"));
});

// Check invite token validity
const checkInviteToken = asyncHandler(async (request, response) => {
    const { inviteToken } = request.params;

    // Find review invite
    const reviewInvite = await ReviewInvite.findOne({ inviteToken }).select("isUsed").lean();
    if(!reviewInvite) throw new ApiError(404, "Review invite not found! Invalid invite token.");
    if(reviewInvite.isUsed) throw new ApiError(400, "This review invite token has already been used");

    // Response
    return response.status(200).json(new ApiResponse(200, { inviteToken }, "Review invite token is valid"));
});

// Crate testimonial
const createTestimonial = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { userProfileId } = request.user.profiles || {};
    const { inviteToken } = request.params;

    // Validate
    if(!userProfileId) throw new ApiError(404, "User profile ID is missing");

    // Get validated payload
    const { rating, title, description } = validate(createTestimonialValidationSchema, request.body) || {};

    // Find review invite    
    const reviewInvite = await ReviewInvite.findOne({ inviteToken })
    .populate({ path:"businessId", select:"_id ownerUserId" });

    // Validate
    if(!reviewInvite) throw new ApiError(404, "Review invite not found! Invalid invite token.");
    if(reviewInvite.isUsed) throw new ApiError(400, "This review invite token has already been used");

    // Same parent profiles restriction
    if(String(reviewInvite.businessId.ownerUserId) === String(userId))
    {
        throw new ApiError(400, "You cannot submit a review to your own business profile");
    }

    // Prevent per user duplication
    const isExist = await Testimonial.exists({ userProfileId });
    if(isExist) throw new ApiError(403, "You have already submitted a testimonial review for this business");

    // Save to db
    const testimonial = await Testimonial.create({
        userProfileId,
        businessProfileId: reviewInvite.businessId._id,
        reviewInviteId: reviewInvite._id,
        rating, 
        title, 
        description
    });
    if(!testimonial) throw new ApiError(500, "Could not create testimonial");

    // Mark invite as used
    reviewInvite.isUsed = true;
    await reviewInvite.save();

    // Send notification to business owner
    await sendNotification({ 
        userOwnerId: reviewInvite.businessId.ownerUserId,
        title:"New Testimonial Received", 
        content:`You have received a new testimonial with a rating of ${rating} stars.`, 
        type:"account", 
        io: request.app.get("io") 
    });

    // Response
    return response.status(201).json(new ApiResponse(201, { rating, title, description }, "Testimonial created successfully"));
}); 

// Fetch testimonials for a business
const fetchTestimonials = asyncHandler(async (request, response) => {
    const { businessId } = request.params;
    if(!isValidObjectId(businessId)) throw new ApiError(400, "Invalid MongoDB ID! Please provide a valid Business ID");

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Fetch testimonials
    const testimonials = await Testimonial.paginate(
        { businessProfileId: businessId }, 
        { 
            page, limit, select:"rating title description createdAt", 
            sort:{ createdAt:-1 },
            populate:{ path:"userProfileId", select:"email fullName" }
        }
    );
    if(!testimonials.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No testimonials found for this business"));

    // Response
    return response.status(200).json(new ApiResponse(200, testimonials, "Testimonials have been fetched"));
});

// View single testimonial
const viewTestimonial = asyncHandler(async (request, response) => {
    const { testimonialId } = request.params;
    if(!isValidObjectId(testimonialId)) throw new ApiError(400, "Invalid MongoDB ID! Please provide a valid testimonial ID");

    // Fetch testimonial
    const testimonial = await Testimonial.findById(testimonialId)
    .populate({ path:"userProfileId", select:"email fullName" })
    .select("userProfileId rating title description createdAt").lean();
    if(!testimonial) throw new ApiError(404, "Testimonial not found");

    // Response
    return response.status(200).json(new ApiResponse(200, testimonial, "Testimonial has been fetched"));
});

// Flag testimonial
const flagTestimonial = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};
    const { testimonialId } = request.params;

    // Sanitize IDs
    if(!businessProfileId) throw new ApiError(400, "Business profile ID is missing");
    if(!isValidObjectId(testimonialId)) throw new ApiError(400, "Invalid MongoDB ID! Please provide a valid testimonial ID");

    // Get flag reason
    const { flagReason = null } = request.body || {};
    if(!flagReason) throw new ApiError(400, "Flag reason is required to flag a testimonial");

    // Find testimonial
    const testimonial = await Testimonial.findById(testimonialId);
    if(!testimonial) throw new ApiError(404, "Testimonial not found");

    // Check if testimonial belongs to the business
    if(String(testimonial.businessId) !== String(businessProfileId)) throw new ApiError(403, "You are not authorized to flag this testimonial");
    
    // Update testimonial status to flagged
    testimonial.status = "flagged";
    testimonial.flagReason = flagReason;
    await testimonial.save();

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Testimonial review has been flagged"));
});

// Delete testimonial
const deleteTestimonial = asyncHandler(async (request, response) => {
    const { testimonialId } = request.params;
    if(!isValidObjectId(testimonialId)) throw new ApiError(400, "Invalid MongoDB ID! Please provide a valid testimonial ID");

    // Find testimonial
    const testimonial = await Testimonial.findByIdAndDelete(testimonialId).select("description").lean();
    if(!testimonial) throw new ApiError(404, "Testimonial not found");

    // Response
    return response.status(200).json(new ApiResponse(200, testimonial, "Testimonial has been deleted"));
});

module.exports = { createReviewInvite, createTestimonial, fetchTestimonials, 
viewTestimonial, flagTestimonial, deleteTestimonial, checkInviteToken };