const { frontendUrl } = require("../constants");
const Subscription = require("../models/subscription");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

// Main middleware to check subscription and attach plan info
const checkSubscription = asyncHandler(async (request, response, next) => {
    const userId = request.user?._id;
    const role = request.user?.role;
    
    // Find subscription with populated plan details
    const subscription = await Subscription.findOne({ userId, status: "active" }).populate("planId");
    if(!subscription) throw new ApiError(403, "No subscription found");
    // if(!subscription) return response.status(303).redirect(`${frontendUrl}/dashboard/${role}/subscriptions`);

    // Check expiry
    const currentDate = new Date();
    if(new Date(subscription.endDate) < currentDate)
    {
        subscription.status = "expired";
        await subscription.save();
        throw new ApiError(403, "Subscription has been expired! Please renew");
        // return response.status(303).redirect(`${frontendUrl}/dashboard/${role}/subscriptions`);
    }

    // Attach subscription and plan info to request object
    request.user.subscription = subscription;
    request.user.plan = subscription.planId;
    request.user.planName = subscription.planId?.name || null;
    request.user.allowsUserAccess = subscription.planId?.allowsUserAccess || false;
    request.user.allowsBusinessAccess = subscription.planId?.allowsBusinessAccess || false;

    return next();
});

// Middleware to check if user has access to user features
const checkUserAccess = asyncHandler(async (request, response, next) => {
    if(!request.user.allowsUserAccess) {
        throw new ApiError(403, "Your current plan does not allow access to user features. Please upgrade your plan.");
    }
    return next();
});

// Middleware to check if user has access to business features
const checkBusinessAccess = asyncHandler(async (request, response, next) => {
    if(!request.user.allowsBusinessAccess) {
        throw new ApiError(403, "Your current plan does not allow access to business features. Please upgrade your plan.");
    }
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

module.exports = { checkSubscription, checkUserAccess, checkBusinessAccess, restrictTrialUser };

 

/*
const { checkSubscription, checkUserAccess, checkBusinessAccess } = require("../middlewares/checkSubscription");

// For user features (TRIAL and SILVER both have access)
router.get("/user-profile", authentication, checkSubscription, checkUserAccess, getUserProfile);

// For business features (only SILVER has access)
router.post("/create-business", authentication, checkSubscription, checkBusinessAccess, createBusiness);

// Just check subscription (plan info available in request.user)
router.get("/dashboard", authentication, checkSubscription, getDashboard);
*/