const { isValidObjectId } = require("mongoose");
const BusinessProfile = require("../models/businessProfileSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { updateCompanyIdentityValidator, operationsAndLogisticsValidator, updateBusinessIntelligenceValidator, 
updateBusinessCertifactesValidator } = require("../validations/businessProfileSettingsValidator");

// Update company identity
const updateCompanyIdentity = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Sanitize
    if(!businessProfileId) throw new ApiError(400, "Business profile not found");
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid business profile ID");
   
    // Get validated payload
    const { ownerName, identificationOfBusinessOwner, companyName, tradeName, businessType, 
    companySize, foundedDate, primaryIndustry, operationHour, countryOfRegistration, website,
    description, businessRegistrationNumber, taxIdentificationNumber, dunsNumber, 
    complianceScreeningStatus } = validate(updateCompanyIdentityValidator, request.body) || {};

    // Update
    const business = await BusinessProfile.findByIdAndUpdate(
        businessProfileId, 
        { 
            $set: { 
                ownerName, identificationOfBusinessOwner, companyName, tradeName, businessType, 
                companySize, foundedDate, primaryIndustry, operationHour, countryOfRegistration, website,
                description, businessRegistrationNumber, taxIdentificationNumber, dunsNumber, 
                complianceScreeningStatus
            } 
        }, 
        { new:true, runValidators:true }
    );
    if(!business) throw new ApiError(404, "Failed to update company identity");

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Company identity has been updated"));
});

// Update operations & logistics
const updateOperationsAndLogistics = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Sanitize
    if(!businessProfileId) throw new ApiError(400, "Business profile not found");
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid business profile ID");
   
    // Get validated payload
    const { location, incoterms, shipping, standardProductDimensions } = validate(operationsAndLogisticsValidator, request.body) || {};

    // Update
    const business = await BusinessProfile.findByIdAndUpdate(
        businessProfileId, 
        { $set: { location, incoterms, "shipping.capabilities": shipping.capabilities, standardProductDimensions } }, 
        { new:true, runValidators:true }
    );
    if(!business) throw new ApiError(404, "Failed to update operations and logistics");

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Company operations and logistics have been updated"));
});

// Update business intelligence
const updateBusinessIntelligence = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Sanitize
    if(!businessProfileId) throw new ApiError(400, "Business profile not found");
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid business profile ID");
   
    // Get validated payload
    const { b2bContact, executiveLeadership, stakeholderDisclosure, regionOfOperations,
    productionCapacity, tradeAffiliations, auditingAgency } = validate(updateBusinessIntelligenceValidator, request.body) || {};

    // Update
    const business = await BusinessProfile.findByIdAndUpdate(
        businessProfileId, 
        { 
            $set: {
                b2bContact, executiveLeadership, stakeholderDisclosure, regionOfOperations,
                productionCapacity, tradeAffiliations, auditingAgency
            } 
        }, 
        { new:true, runValidators:true }
    );
    if(!business) throw new ApiError(404, "Failed to update business intelligence");

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Business intelligence has been updated"));
});

// Update certificates
const updateBusinessCertificates = asyncHandler(async (request, response) => {
    const { businessProfileId } = request.user.profiles || {};

    // Sanitize
    if(!businessProfileId) throw new ApiError(400, "Business profile not found");
    if(!isValidObjectId(businessProfileId)) throw new ApiError(400, "Invalid business profile ID");
   
    // Get validated payload
    const { certificateOfIncorporation, taxRegistrationCertificate, 
    certifications } = validate(updateBusinessCertifactesValidator, request.body) || {};

    // Update
    const business = await BusinessProfile.findByIdAndUpdate(
        businessProfileId, 
        { $set: { certificateOfIncorporation, taxRegistrationCertificate, certifications } }, 
        { new:true, runValidators:true }
    );
    if(!business) throw new ApiError(404, "Failed to update business certificates");

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Business certificates have been updated"));
});

module.exports = { updateCompanyIdentity, updateOperationsAndLogistics, 
updateBusinessIntelligence, updateBusinessCertificates };