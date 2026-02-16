const BusinessProfile = require("../models/businessProfileSchema");
const ReviewInvite = require("../models/reviewInviteModel");
const Testimonial = require("../models/testimonialModel");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const crypto = require("crypto");
const validate = require("../utils/validate");
const { createTestimonialValidationSchema } = require("../validations/testimonialsValidator");
const { emptyList } = require("../constants");
const sendNotification = require("../utils/sendNotification");

// Create review invite
const createReviewInvite = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find business profile
    const businessProfile = await BusinessProfile.findOne({ ownerUserId:userId });
    if(!businessProfile) throw new ApiError(404, "Business profile not found");
    
    // Generate random invite token
    const inviteToken = crypto.randomBytes(20).toString("hex");
    if(!inviteToken) throw new ApiError(500, "Could not generate review invite token");

    // Save to db
    const reviewInvite = await ReviewInvite.create({ businessId:businessProfile._id, inviteToken });
    if(!reviewInvite) throw new ApiError(500, "Could not create review invite");
    
    // Response
    return response.status(201).json(new ApiResponse(201, { inviteToken }, "Review invite created successfully"));
});

// Check invite token validity
const checkInviteToken = asyncHandler(async (request, response) => {
    const { inviteToken } = request.params;

    // Find review invite
    const reviewInvite = await ReviewInvite.findOne({ inviteToken }).select("isUsed").lean();
    if(!reviewInvite) throw new ApiError(404, "Review invite not found");
    if(reviewInvite.isUsed) throw new ApiError(400, "Review invite has already been used");

    // Response
    return response.status(200).json(new ApiResponse(200, reviewInvite, "Review invite is valid"));
});

// Crate testimonial
const createTestimonial = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { inviteToken } = request.params;

    // Get validated payload
    const { rating, title, description } = validate(createTestimonialValidationSchema, request.body) || {};

    // Find user profile
    const userProfile = await UserProfile.findOne({ userId }).select("fullName email").lean();
    if(!userProfile) throw new ApiError(404, "User profile not found");

    // Find review invite    
    const reviewInvite = await ReviewInvite.findOne({ inviteToken });
    if(!reviewInvite) throw new ApiError(404, "Review invite not found");
    if(reviewInvite.isUsed) throw new ApiError(400, "Review invite has already been used");

    // Create testimonial
    const testimonial = await Testimonial.create({
        businessId: reviewInvite.businessId,
        reviewInviteId: reviewInvite._id,
        reviewerName: userProfile.fullName,
        reviewerEmail: userProfile.email,
        rating, 
        title, 
        description
    });
    if(!testimonial) throw new ApiError(500, "Could not create testimonial");

    // Mark invite as used
    reviewInvite.isUsed = true;
    reviewInvite.usedAt = new Date();
    await reviewInvite.save();

    // Notify parent user about new testimonial
    const businessProfile = await BusinessProfile.findById(reviewInvite.businessId).select("ownerUserId").lean();

    // Send notification to business owner
    await sendNotification({ 
        userOwnerId:businessProfile.ownerUserId, 
        title:"New Testimonial Received", 
        content:`You have received a new testimonial from ${userProfile.fullName} with a rating of ${rating} stars.`, 
        type:"account", 
        io: request.app.get("io") 
    });

    // Response
    return response.status(201).json(new ApiResponse(201, testimonial, "Testimonial created successfully"));
}); 

// Fetch testimonials for a business
const fetchTestimonials = asyncHandler(async (request, response) => {
    const { businessId } = request.params;

    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Fetch testimonials
    const testimonials = await Testimonial.paginate(
        { businessId }, 
        { page, limit, select:"reviewerName reviewerEmail rating title description createdAt", sort:{ createdAt:-1 } 
    });
    if(!testimonials.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No testimonials found for this business"));

    // Response
    return response.status(200).json(new ApiResponse(200, testimonials, "Testimonials have been fetched"));
});

// View single testimonial
const viewTestimonial = asyncHandler(async (request, response) => {
    const { testimonialId } = request.params;

    // Fetch testimonial
    const testimonial = await Testimonial.findById(testimonialId)
    .select("reviewerName reviewerEmail rating title description createdAt").lean();
    if(!testimonial) throw new ApiError(404, "Testimonial not found");

    // Response
    return response.status(200).json(new ApiResponse(200, testimonial, "Testimonial has been fetched"));
});

// Flag testimonial
const flagTestimonial = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { testimonialId } = request.params;

    // Get flag reason
    const { flagReason = null } = request.body || {};
    if(!flagReason) throw new ApiError(400, "Flag reason is required to flag a testimonial");

    // Find business profile
    const businessProfile = await BusinessProfile.findOne({ ownerUserId:userId });
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Find testimonial
    const testimonial = await Testimonial.findById(testimonialId);
    if(!testimonial) throw new ApiError(404, "Testimonial not found");

    // Check if testimonial belongs to the business
    if(String(testimonial.businessId) !== String(businessProfile._id)) throw new ApiError(403, "You are not authorized to flag this testimonial");
    
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

    // Find testimonial
    const testimonial = await Testimonial.findByIdAndDelete(testimonialId).select("description").lean();
    if(!testimonial) throw new ApiError(404, "Testimonial not found");

    // Response
    return response.status(200).json(new ApiResponse(200, testimonial, "Testimonial has been deleted"));
});

module.exports = { createReviewInvite, createTestimonial, fetchTestimonials, 
viewTestimonial, flagTestimonial, deleteTestimonial, checkInviteToken };