const { Router } = require("express");
const { fetchMyNotifications } = require("../controllers/notificationsController");
const { authentication } = require("../middlewares/auth");

// Router instance
const notificationsRouter = Router();

// Fetch my notifications
notificationsRouter.route("/").get(authentication, fetchMyNotifications);

module.exports = notificationsRouter;