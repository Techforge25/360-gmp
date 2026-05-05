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

      // Fetch latest notifications
      const options = {
         page: 1,
         limit: 10,
         select: "-userId -updatedAt -__v",
         sort: { createdAt: -1 }
      };

      // Retrieve notifications
      const notifications = await Notification.paginate({ userId, type }, options);
      notifications.unreadCount = unreadCount;

      // Emit real-time notification
      if(io) io.to(String(userId)).emit("notification", notifications);
   } 
   catch(error) 
   {
      throw new ApiError(500, "Failed to save notification");
   }
};

module.exports = sendNotification;