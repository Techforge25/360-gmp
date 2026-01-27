const { emptyList } = require("../constants");
const Support = require("../models/supportModel");
const sendEmail = require("../service/email");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const convertToMongoId = require("../utils/convertToMongoId");
const validate = require("../utils/validate");
const supportEmailValidationSchema = require("../validations/supportEmailValidator");

// Support email
const supportEmail = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Validate payload
    const { subject, category, description, 
    fileType = null, fileURL = null } = validate(supportEmailValidationSchema, request.body);

    // Save to db
    const support = await Support.create({ userId, subject, category, description, fileType, fileURL });
    if(!support) throw new ApiError(500, "Failed to save support email");

    // Prepare attachment (if file exists)
    let attachments = [];
    if(fileURL && fileType) 
    {
        attachments.push({
            filename: `attachment.${fileType}`, // e.g. attachment.png / attachment.pdf
            path:fileURL // Cloudinary URL works
        });
    }

    // Email content
    const html = `
        <h2>New Support Request</h2>
        <p><strong>User ID:</strong> ${userId}</p>
        <p><strong>Category:</strong> ${category}</p>
        <p><strong>Subject:</strong> ${subject}</p>
        <p><strong>Description:</strong></p>
        <p>${description}</p>
    `;   
    
    // Send
    const result = await sendEmail("usmanhameed1790@gmail.com", subject, html, attachments);
    if(!result) throw new ApiError(500, "Failed to send support email");

    // Response
    return response.status(200).json(new ApiResponse(200, support, "Your email has been sent to support team!"));
});

// Fetch all support emails
const fetchAllSupportEmails = asyncHandler(async (request, response) => {
    // Pagination filter
    const { page = 1, limit = 10 } = request.query;

    // Fetch
    const supportEmails = await Support.paginate({}, { page, limit });
    if(!supportEmails.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No support email found"));

    // Response
    return response.status(200).json(new ApiResponse(200, supportEmails, "Support emails have been fetched"));
});

// Fetch my support emails
const fetchMySupportEmails = asyncHandler(async (request, response) => {
    const userId = convertToMongoId(request.user._id);

    // Pagination filter
    const { page = 1, limit = 10 } = request.query;

    // Fetch
    const supportEmails = await Support.paginate({ userId }, { page, limit });
    if(!supportEmails.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "No support email found"));

    // Response
    return response.status(200).json(new ApiResponse(200, supportEmails, "Support emails have been fetched"));
});

module.exports = { supportEmail, fetchAllSupportEmails, fetchMySupportEmails };