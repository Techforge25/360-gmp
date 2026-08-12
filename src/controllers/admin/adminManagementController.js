const { isValidObjectId } = require("mongoose");
const Admin = require("../../models/adminModel");
const ApiError = require("../../utils/ApiError");
const ApiResponse = require("../../utils/ApiResponse");
const asyncHandler = require("../../utils/asyncHandler");
const validate = require("../../utils/validate");
const { createAdminValidator, updateAdminValidator, updateAdminPasswordValidator } = require("../../validations/adminValidator");
const { emptyList, superAdminId } = require("../../constants");
const adminEmailQueue = require("../../queues/adminEmailQueue");
const convertToMongoId = require("../../utils/convertToMongoId");

// Initiator
const adminManagementInitiator = asyncHandler(async (request, response) => {
    // Response
    return response.status(200).json(new ApiResponse(200, { hasAccess: true }, "Initiate Admin Management Module"));
});

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
    await adminEmailQueue.add("sendInvitationToAdmin", { username, email, password, allowedModules });
    
    // Response
    return response.status(201).json(new ApiResponse(201, null, "Admin has been created"));
});

// Fetch admins
const fetchAdmins = asyncHandler(async (request, response) => {
    // Pagination options
    const { page = 1, limit = 10, status = "active" } = request.query;

    // Validate status key
    if(!["active", "inactive"].includes(status)) throw new ApiError(400, "Invalid status key. Allowed keys are: 'active', 'inactive'");

    // Fetch
    const admins = await Admin.aggregatePaginate([
        // Match
        { $match: { _id: { $ne: convertToMongoId(superAdminId) }, status } },

        // Sort
        { $sort: { createdAt: -1 } },

        // Projection
        { $project: { username: 1, email: 1, allowedModules: 1, createdAt: 1 } }
    ], { page: Number(page), limit: Number(limit) });
    if(!admins.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, `No ${status} admin found`));

    // Response message
    const message = status === "active" ? "Active admins have been fetched" : "Inactive admins have been fetched";

    // Response
    return response.status(200).json(new ApiResponse(200, admins, message));
});

// View admin
const viewAdmin = asyncHandler(async (request, response) => {
    // Sanitize admin
    const { adminId } = request.params;
    if(!isValidObjectId(adminId)) throw new ApiError(400, "Invalid Admin ID");
    
    // Fetch
    const admin = await Admin.findById(adminId).select("-_id username email allowedModules status").lean();
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
    const { username, allowedModules } = validate(updateAdminValidator, request.body) || {};

    // Find admin
    const admin = await Admin.findById(adminId);
    if(!admin) throw new ApiError(404, "Admin not found");

    // Update
    Object.assign(admin, { username, allowedModules });
    await admin.save();

    // Send email
    await adminEmailQueue.add("sendEmailOnAdminDetailsUpdation", { email: admin.email, username, allowedModules });

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Admin details have been updated"));
});

// Update admin password
const updateAdminPassword = asyncHandler(async (request, response) => {
    // Sanitize admin
    const { adminId } = request.params;
    if(!isValidObjectId(adminId)) throw new ApiError(400, "Invalid Admin ID");

    // Get validated payload
    const { password } = validate(updateAdminPasswordValidator, request.body) || {};

    // Find admin
    const admin = await Admin.findById(adminId);
    if(!admin) throw new ApiError(404, "Admin not found");

    // Match password
    const matchPassword = await admin.matchPassword(password);
    if(matchPassword) throw new ApiError(400, "New password cannot be the same as previous password");

    // Update
    Object.assign(admin, { password });
    await admin.save();

    // Send email to admin on password updation
    await adminEmailQueue.add("sendEmailOnPasswordChange", { email: admin.email, password });    

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Admin password has been updated"));
});

// Delete admin
const deleteAdmin = asyncHandler(async (request, response) => {
    // Sanitize admin
    const { adminId } = request.params;
    if(!isValidObjectId(adminId)) throw new ApiError(400, "Invalid Admin ID");

    // Prevent super admin deletion
    if(adminId === superAdminId) throw new ApiError(403, "Super admin cannot be deleted");

    // Find and validate
    const admin = await Admin.findById(adminId);
    if(!admin) throw new ApiError(404, "Admin not found");
    if(admin.status === "inactive") throw new ApiError(400, "This admin has already been deleted");

    // Update
    admin.status = "inactive";
    await admin.save();

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Admin has been deleted"));
});

// Restore admin
const restoreAdmin = asyncHandler(async (request, response) => {
    // Sanitize admin
    const { adminId } = request.params;
    if(!isValidObjectId(adminId)) throw new ApiError(400, "Invalid Admin ID");

    // Find and validate
    const admin = await Admin.findById(adminId);
    if(!admin) throw new ApiError(404, "Admin not found");
    // if(admin.status === "active") throw new ApiError(400, "This admin is already in active mode");

    // Update
    admin.status = "active";
    await admin.save();

    // Send email to admin on account restoration
    await adminEmailQueue.add("sendEmailOnAccountRestoration", { email: admin.email, timestamp: admin.updatedAt });

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Admin has been restored"));
});

module.exports = { adminManagementInitiator, createAdmin, fetchAdmins, viewAdmin, updateAdmin, 
updateAdminPassword, deleteAdmin, restoreAdmin };