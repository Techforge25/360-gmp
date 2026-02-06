const Notification = require("../models/notificationsModel");

// Send notification helper
const sendNotification = async ({ userOwnerId, title, content, type = "account", io }) => {
   const notification = await Notification.create({ userOwnerId, title, content, type });
   io.to(`user:${userOwnerId}`).emit("notification", notification);
};

module.exports = sendNotification;