const { frontendURL } = require("../constants");
const Subscription = require("../models/subscription");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Main middleware to check subscription and attach plan info
const checkSubscription = asyncHandler(async (request, response, next) => {
    const { _id:userId, role } = request.user;

    // Redirect url key
    const redirectURL = `${frontendURL}/onboarding/plans`;
    // const redirectURL = `http://localhost:3000/onboarding/plans`;

    // Find subscription with populated plan details
    const subscription = await Subscription.findOne({ userId, status: "active" }).populate("planId");
    if(!subscription) return response.status(200).json(new ApiResponse(200, { userId, role, redirectURL }, "Subscription required"));
    
    // Check expiry
    const currentDate = new Date();
    if(new Date(subscription.endDate) < currentDate)
    {
        subscription.status = "expired";
        await subscription.save();
        return response.status(200).json(new ApiResponse(200, { userId, role, redirectURL }, "Subscription has been expired! Please renew"));
    }

    // Attach subscription and plan info to request object
    request.user.subscription = subscription;
    request.user.plan = subscription.planId;
    request.user.planName = subscription.planId?.name || null;

    return next();
});

// Restrict trial users from certain actions
const restrictTrialUser = asyncHandler(async (request, response, next) => {
    const { planName } = request.user || {};
    if (!planName) throw new ApiError(401, "Unauthorized: Subscription plan information is missing.");

    // Validate allowed plans
    const allowedPlans = ["TRIAL", "SILVER", "PREMIUM"];
    if(!allowedPlans.includes(planName)) throw new ApiError(400, "Invalid subscription plan.");
    
    // Restrict trial users
    if(planName === "TRIAL") throw new ApiError(403, "Access denied. Please upgrade your plan to perform this action.");
    return next();
});

module.exports = { checkSubscription, restrictTrialUser };