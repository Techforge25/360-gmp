const { emptyList } = require("../constants");
const Notification = require("../models/notificationsModel");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Fetch my notifications
const fetchMyNotifications = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { type } = request.params;
    const { page = 1, limit = 10 } = request.query;

    // Allowed types
    const allowedTypes = ["System", "UserProfile", "BusinessProfile", "Public"];
    if(!allowedTypes.includes(type)) throw new ApiError(400, "Invalid notification type");

    // Options
    const options = {
        page: Number(page),
        limit: Number(limit),
        select: "-userId -updatedAt -__v",
        sort: { createdAt: -1 }
    };

    // Base filter
    const baseFilter = { type };
    if(type !== "Public") baseFilter.userId = userId;

    // Retrieve notifications
    const notifications = await Notification.paginate(baseFilter, options);
    if(!notifications.totalDocs) return response.status(200).json(new ApiResponse(200, emptyList, `No ${type} notifications found`));

    // Response
    return response.status(200).json(new ApiResponse(200, notifications, "Notifications have been fetched"));
});

// Mark all as read
const markAllAsRead = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Find notifications and check if they are already read
    const notifications = await Notification.find({ userId, haveSeen:false }).lean();
    if(!notifications.length) return response.status(200).json(new ApiResponse(200, notifications, "All notifications have already been read"));

    // Mark all as read
    const markNotifications = await Notification.updateMany(
        { userId, haveSeen:false }, 
        { $set:{ haveSeen:true } }
    );

    // Response
    return response.status(200).json(new ApiResponse(200, markNotifications, "All notifications have been marked as read"));
});

module.exports = { fetchMyNotifications, markAllAsRead };