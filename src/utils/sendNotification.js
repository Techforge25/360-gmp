const { allowedNotificationTypes } = require("../constants");
const Notification = require("../models/notificationsModel");
const ApiError = require("./ApiError");

// Send notification helper
const sendNotification = async ({ userId, title, content, type, io = null }) => {
   try 
   {
      // Validate type
      if(!allowedNotificationTypes.includes(type)) throw new ApiError(400, "Invalid notification type");

      // Save to db
      const notification = await Notification.create({ userId, title, content, type });
      if(!notification) throw new ApiError(400, "Failed to create notification! Invalid payload");

      // Count unread notification
      const unreadCount = await Notification.countDocuments({ userId, haveSeen:false });

      // Emit real-time notification
      if(io) io.to(String(userId)).emit("notification", { title, content, type, createdAt: notification.createdAt, unreadCount }); 
   } 
   catch(error) 
   {
      throw new ApiError(500, "Failed to save notification");
   }
};

module.exports = sendNotification;