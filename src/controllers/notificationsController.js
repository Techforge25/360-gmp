const { emptyList } = require("../constants");
const Notification = require("../models/notificationsModel");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Fetch my notifications
const fetchMyNotifications = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Options
    const options = {
        page: Number(request.query.page) || 1,
        limit: Number(request.query.limit) || 10,
        sort: { createdAt:-1 }
    };

    // Retrieve notifications
    const notifications = await Notification.paginate({ $or:[{ userId }, { type:"public" }] }, options);
    if(!notifications.docs?.length) return response.status(200).json(new ApiResponse(200, emptyList, "You don't have any notification"));

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