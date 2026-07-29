const { isValidObjectId } = require("mongoose");
const Admin = require("../../models/adminModel");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../utils/validate");
const { createAdminValidator, updateAdminValidator } = require("../../validations/adminValidator");
const emailQueue = require("../../queues/emailQueue");
const { emptyList } = require("../../constants");

// Create admin
const createAdmin = asyncHandler(async (request, response) => {
    // Get validated payload
    const { username, email, password, allowedModules } = validate(createAdminValidator, request.body) || {};

    // Prevent username duplication
    const usernameExist = await Admin.exists({ username });
    if(usernameExist) throw new ApiError(409, "This username is already taken");

    // Prevent email duplication
    const emailExist = await Admin.exists({ email });
    if(emailExist) throw new ApiError(409, "This email is already taken");    

    // Save
    const admin = await Admin.create({ username, email, password, allowedModules });
    if(!admin) throw new ApiError(500, "Failed to create admin");

    // Send invitation email to admin
    await emailQueue.add("sendInvitationToAdmin", { username, email, password });
    
    // Response
    return response.status(201).json(new ApiResponse(201, null, "Admin has been created"));
});

// Fetch admins
const fetchAdmins = asyncHandler(async (request, response) => {
    // Pagination options
    const { page = 1, limit = 10 } = request.query;

    // Fetch
    const admins = await Admin.aggregatePaginate([
        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        { $project: { username: 1, email: 1, allowedModules: 1, createdAt: 1 } }
    ], { page: Number(page), limit: Number(limit) });
    if(!admins.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, "No admin found"));

    // Response
    return response.status(200).json(new ApiResponse(200, admins, "Admins have been fetched"));
});

// View admin
const viewAdmin = asyncHandler(async (request, response) => {
    // Sanitize admin
    const { adminId } = request.params;
    if(!isValidObjectId(adminId)) throw new ApiError(400, "Invalid Admin ID");
    
    // Fetch
    const admin = await Admin.findById(adminId).select("-_id username email allowedModules").lean();
    if(!admin) throw new ApiError(404, "Admin not found");

    // Response
    return response.status(200).json(new ApiResponse(200, admin, "Admin details have been fetched"));
});

// Update admin
const updateAdmin = asyncHandler(async (request, response) => {
    // Sanitize admin
    const { adminId } = request.params;
    if(!isValidObjectId(adminId)) throw new ApiError(400, "Invalid Admin ID");

    // Get validated payload
    const { username, password, allowedModules } = validate(updateAdminValidator, request.body) || {};

    // Find admin
    const admin = await Admin.findById(adminId);
    if(!admin) throw new ApiError(404, "Admin not found");

    // Update
    Object.assign(admin, { username, password, allowedModules });
    await admin.save();

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Admin details have been updated"));
});

module.exports = { createAdmin, fetchAdmins, viewAdmin, updateAdmin };