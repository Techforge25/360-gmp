const Subscription = require("../models/subscription");
const ApiError = require("../utils/ApiError");
const asyncHandler = require("../utils/asyncHandler");

const checkSubscription = asyncHandler(async (request, response, next) => {
    const _id = request.user?._id;
    const subscription = await Subscription.findOne({ userId:_id, status:"active" });
    if(!subscription) throw new ApiError(400, "No subscriptions found");

    // Check expiry
    const currentDate = new Date();
    if(new Date(subscription.endDate) < currentDate)
    {
        subscription.status = "expired";
        await subscription.save();
        throw new ApiError(403, "Your subscription has been expired! Please renew");
    }

    return next();
});

module.exports = checkSubscription;