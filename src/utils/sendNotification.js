const Notification = require("../models/notificationsModel");
const ApiError = require("./ApiError");

// Send notification helper
const sendNotification = async ({ userOwnerId = null, title, content, type = "account", io }) => {
   try 
   {
      // Save to db
      const notification = await Notification.create({ userId: userOwnerId, title, content, type });

      // Enforce user owner id for non-public notification
      if(type !== "public" && !userOwnerId) throw new ApiError(400, "User owner ID is required for non-public notifications");

      if(type.toLowerCase() === "public")
      {
         // Public notification
         io.emit("notification", notification);
      }
      else
      {
         // Private notification
         io.to(`user:${userOwnerId}`).emit("notification", notification);
      }      
   } 
   catch(error) 
   {
      throw new ApiError(500, "Failed to save notification");
   }
};

module.exports = sendNotification;