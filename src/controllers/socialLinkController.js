const BusinessProfile = require("../models/businessProfileSchema");
const SocialLink = require("../models/socialLinkModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { getBusinessProfile } = require("../utils/getProfiles");
const validate = require("../utils/validate");
const socialLinkValidationSchema = require("../validations/socialLinkValidator");

// Create social link
const createSocialLink = asyncHandler(async (request, response) => {
    const { platformName, url } = validate(socialLinkValidationSchema, request.body);
    const userId = request.user._id;

    // Get business profile
    const businessProfile = await getBusinessProfile(userId);
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Save social link to db
    const socialLink = await SocialLink.create({ platformName, url, businessProfileId: businessProfile._id });
    if(!socialLink) throw new ApiError(500, "Failed to add social link");

    // Response
    return response.status(201).json(new ApiResponse(201, socialLink, "Social link added successfully"));
});

// Get social links
const getSocialLinks = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.params;

    // Get social links
    const socialLinks = await SocialLink.find({ businessProfileId }).lean();
    if(!socialLinks) throw new ApiError(404, "Social links not found");

    // Response
    return response.status(200).json(new ApiResponse(200, socialLinks, "Social links have been fetched successfully"));
});

// Remove social link
const removeSocialLink = asyncHandler(async (request, response) => {
    const { socialLinkId } = request.params;

    // Remove social link
    const socialLink = await SocialLink.findByIdAndDelete(socialLinkId);
    if(!socialLink) throw new ApiError(404, "Social link not found");
    return response.status(200).json(new ApiResponse(200, socialLink, "Social link has been removed successfully"));
});

module.exports = { createSocialLink, getSocialLinks, removeSocialLink };