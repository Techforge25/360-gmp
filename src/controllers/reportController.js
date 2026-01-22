const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const reportJobValidationSchema = require("../validations/reportJobValidator");

// Create job report
const createJobReport = asyncHandler(async (request, response) => {
    const { jobId, subject, category, description, evidences = [] } = validate(reportJobValidationSchema, request.body);
    
});

module.exports = { createJobReport };