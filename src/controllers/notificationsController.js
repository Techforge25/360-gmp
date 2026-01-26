const Notification = require("../models/notificationsModel");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { isValidObjectId } = require("mongoose");

// Helper to create notification
const createNotification = async (userId, content) => {
    // Validate Mongodb ID and notification content
    if(!isValidObjectId(userId)) throw new ApiError(400, "Invalid Object ID");
    if(!content) throw new ApiError(400, "Notification content is required");

    // Add notification
    const notification = await Notification.create({ userId, content });
    if(!notification) throw new ApiError(500, "Failed to create notification");

    // Response
    return true;
};

// Fetch my notifications
const fetchMyNotifications = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const notifications = await Notification.find({ userId }).lean();

    // Response
    return response.status(200).json(new ApiResponse(200, notifications, "Notifications have been fetched"));
});

module.exports = { createNotification, fetchMyNotifications };