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

      if(type === "Public")
      {
         // Public notification
         io.emit("notification", { userId, title, content, type });
      }
      else
      {
         // Private notification
         io.to(`${String(userId)}`).emit("notification", { userId, title, content, type });
      }      
   } 
   catch(error) 
   {
      throw new ApiError(500, "Failed to save notification");
   }
};

module.exports = sendNotification;