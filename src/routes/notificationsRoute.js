const { Router } = require("express");
const { fetchMyNotifications, markAllAsRead } = require("../controllers/notificationsController");
const { authentication } = require("../middlewares/auth");

// Router instance
const notificationsRouter = Router();

// Fetch my notifications
notificationsRouter.route("/").get(authentication, fetchMyNotifications);

// Mark all as read
notificationsRouter.route("/mark-all-as-read").patch(authentication, markAllAsRead);

module.exports = notificationsRouter;