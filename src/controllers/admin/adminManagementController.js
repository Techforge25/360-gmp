const { isValidObjectId } = require("mongoose");
const Admin = require("../../models/adminModel");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../utils/validate");
const { createAdminValidator, assignModuleValidator } = require("../../validations/adminValidator");

// Create admin
const createAdmin = asyncHandler(async (request, response) => {
    // Get validated payload
    const { username, password, allowedModules } = validate(createAdminValidator, request.body) || {};

    // Prevent username duplication
    const exists = await Admin.exists({ username });
    if(exists) throw new ApiError(409, "This username is already taken");

    // Save
    const admin = await Admin.create({ username, password, allowedModules });
    if(!admin) throw new ApiError(500, "Failed to create admin");
    
    // Response
    return response.status(201).json(new ApiResponse(201, null, "Admin has been created"));
});

// Assign module to admin
const assignModuleToAdmin = asyncHandler(async (request, response) => {
    // Sanitize ID
    const { adminId } = request.params;
    if(!isValidObjectId(adminId)) throw new ApiError(400, "Invalid Admin ID");

    // Get validated payload
    const { allowedModules } = validate(assignModuleValidator, request.body) || {};

    // Update
    const admin = await Admin.findByIdAndUpdate(adminId, { $set: { allowedModules } }, { returnDocument: 'after' });
    if(!admin) throw new ApiError(404, "Admin not found");

    // Response
    return response.status(200).json(new ApiResponse(200, admin.allowedModules, "Module has been assigned"));
});

module.exports = { createAdmin, assignModuleToAdmin };