const { emptyList, allowedNotificationTypes } = require("../constants");
const Notification = require("../models/notificationsModel");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");

// Fetch my notifications
const fetchMyNotifications = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { type } = request.params;
    const { page = 1, limit = 10 } = request.query;

    // Allowed types
    if(!allowedNotificationTypes.includes(type)) throw new ApiError(400, "Invalid notification type");

    // Options
    const options = {
        page: Number(page),
        limit: Number(limit),
        select: "-userId -updatedAt -__v",
        sort: { createdAt: -1 }
    };

    // Retrieve notifications
    const notifications = await Notification.paginate({ userId, type }, options);

    // Get count of unread notifications
    const unreadCount = await Notification.countDocuments({ userId, haveSeen: false });
    if(!notifications.totalDocs) return response.status(200).json(new ApiResponse(200, { ...emptyList, unreadCount }, `No ${type} notifications found`));

    // Response
    return response.status(200).json(new ApiResponse(200, { ...notifications, unreadCount }, "Notifications have been fetched"));
});

// Mark all as read
const markAllAsRead = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { type } = request.params;

    // Allowed types
    if(!allowedNotificationTypes.includes(type)) throw new ApiError(400, "Invalid notification type");    

    // Find notifications and check if they are already read
    const notifications = await Notification.find({ userId, type, haveSeen:false }).lean();
    if(!notifications.length) return response.status(200).json(new ApiResponse(200, notifications, "All notifications have already been read"));

    // Mark all as read
    const markNotifications = await Notification.updateMany(
        { userId, type, haveSeen:false }, 
        { $set:{ haveSeen:true } },
        { new:true }
    );
    if(!markNotifications) throw new ApiError(500, "Failed to mark all notifications as read");

    // Unread count
    const unreadCount = await Notification.countDocuments({ userId, haveSeen:false });


    // Emit
    const io = request.app.get("io");
    io.to(String(userId)).emit("mark-as-all-read", { type, unreadCount });

    // Response
    return response.status(200).json(new ApiResponse(200, { allRead:true }, "All notifications have been marked as read"));
});

module.exports = { fetchMyNotifications, markAllAsRead };