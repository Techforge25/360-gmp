const { isValidObjectId } = require("mongoose");
const BusinessProfile = require("../models/businessProfileSchema");
const User = require("../models/users");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { updateCompanyIdentityValidator, operationsAndLogisticsValidator, 
updateBusinessIntelligenceValidator } = require("../validations/businessProfileSettingsValidator");

// Update company identity
const updateCompanyIdentity = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Sanitize
    if(!businessProfileId) throw new ApiError(400, "Business profile not found");
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid business profile ID");
   
    // Get validated payload
    const payload = validate(updateCompanyIdentityValidator, request.body) || {};

    // Update
    const business = await BusinessProfile.findByIdAndUpdate(businessProfileId, { $set:payload }, { new:true, runValidators:true });
    if(!business) throw new ApiError(404, "Failed to update company identity");

    // Response
    return response.status(200).json(new ApiResponse(200, { ...payload }, "Company identity has been updated"));
});

// Update operations & logistics
const updateOperationsAndLogistics = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Sanitize
    if(!businessProfileId) throw new ApiError(400, "Business profile not found");
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid business profile ID");
   
    // Get validated payload
    const payload = validate(operationsAndLogisticsValidator, request.body) || {};

    // Update
    const business = await BusinessProfile.findByIdAndUpdate(businessProfileId, { $set:payload }, { new:true, runValidators:true });
    if(!business) throw new ApiError(404, "Failed to update operations and logistics");

    // Response
    return response.status(200).json(new ApiResponse(200, { ...payload }, "Company operations and logistics have been updated"));
});

// Update business intelligence
const updateBusinessIntelligence = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Sanitize
    if(!businessProfileId) throw new ApiError(400, "Business profile not found");
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid business profile ID");
   
    // Get validated payload
    const payload = validate(updateBusinessIntelligenceValidator, request.body) || {};

    // Update
    const business = await BusinessProfile.findByIdAndUpdate(businessProfileId, { $set:payload }, { new:true, runValidators:true });
    if(!business) throw new ApiError(404, "Failed to update business intelligence");

    // Response
    return response.status(200).json(new ApiResponse(200, { ...payload }, "Business intelligence has been updated"));
});

module.exports = { updateCompanyIdentity, updateOperationsAndLogistics, updateBusinessIntelligence };