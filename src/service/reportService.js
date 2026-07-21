const BusinessProfile = require("../models/businessProfileSchema");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const sendEmail = require("./email");

// Report business profile service
const reportBusiness = async (businessProfileId, reason, description) => {
    try
    {
        // Find business
        const business = await BusinessProfile.findById(businessProfileId).select("ownerName").lean();
        if(!business) return false;

        // Send gmail
        const result = await sendEmail(process.env.GMAIL, reason, description);
        if(!result) return false;
        
        return true;
    }
    catch(error)
    {
        console.log(`Failed to report business ${error.message}`);
        return false;
    }
};

module.exports = { reportBusiness };