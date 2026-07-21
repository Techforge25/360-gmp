const { isValidObjectId } = require("mongoose");
const BusinessProfile = require("../models/businessProfileSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { updateCompanyIdentityValidator, updateBusinessInfoValidator } = require("../validations/businessProfileSettingsValidator");

// Fetch business settings info
const fetchBusinessInfo = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Fetch
    const businessProfile = await BusinessProfile.findById(businessProfileId)
    .select(`tradeName companySize operationHour website warehouseAddress additionalWarehouseAddress 
    incoterms termsAndCapability internationalOffices primaryContactPerson operationalAndTradeProfile description`);
    if(!businessProfile) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, businessProfile, "Business profile info has been fetched"));
});

// Update business info
const updateBusinessInfo = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Get validated payload
    const { tradeName, companySize, operationHour, website, description, warehouseAddress, 
    additionalWarehouseAddress, incoterms, termsAndCapability, internationalOffices, 
    primaryContactPerson, operationalAndTradeProfile } = validate(updateBusinessInfoValidator, request.body);

    // Update
    const business = await BusinessProfile.findByIdAndUpdate(
        businessProfileId, 
        { 
            $set: { 
                tradeName, companySize, operationHour, website, description, warehouseAddress, 
                additionalWarehouseAddress, incoterms, termsAndCapability, internationalOffices, 
                primaryContactPerson, operationalAndTradeProfile
            } 
        }
    );
    if(!business) throw new ApiError(404, "Business profile not found");

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Business info has been updated"));
});

module.exports = { fetchBusinessInfo, updateBusinessInfo };