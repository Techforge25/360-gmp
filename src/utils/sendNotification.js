const Notification = require("../models/notificationsModel");
const ApiError = require("./ApiError");

// Send notification helper
const sendNotification = async ({ userId = null, title, content, type, io }) => {
   try 
   {
      // Validate type
      if(!["System", "UserProfile", "BusinessProfile", "Public"].includes(type)) throw new ApiError(400, "Invalid notification type");
   
      // Enforce user owner id for non-public notification
      if(type !== "Public" && !userId) throw new ApiError(400, "User ID is required for non-public notifications");  

      // Save to db
      const notification = await Notification.create({ userId, title, content, type });
      if(!notification) throw new ApiError(400, "Failed to create notification! Invalid payload");

      // Notification payload for socket
      const notificationPayload = { title, content, type, createdAt: notification.createdAt };

      if(type === "Public")
      {
         // Public notification
         io.emit("notification", notificationPayload);
      }
      else
      {
         // Private notification
         io.to(String(userId)).emit("notification", notificationPayload);
      }      
   } 
   catch(error) 
   {
      throw new ApiError(500, "Failed to save notification");
   }
};

module.exports = sendNotification;