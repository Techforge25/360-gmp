const BusinessProfile = require("../models/businessProfileSchema");
const Chat = require("../models/chatsModel");
const CustomOffer = require("../models/customOfferModel");
const Product = require("../models/products");
const TrialUsage = require("../models/trialUsageModel");
const UserProfile = require("../models/userProfile");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const convertToMongoId = require("../utils/convertToMongoId");
const generateConversationId = require("../utils/generateConversationId");
const validate = require("../utils/validate");
const { privateMessageValidationSchema } = require("../validations/chatValidator");

// Send private message
const sendPrivateMessage = asyncHandler(async (request, response) => {
    
    // Response
    return response.status(200).json(new ApiResponse(200, null, "Message has been sent"));
});


module.exports = { sendPrivateMessage };