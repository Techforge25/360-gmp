const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { sendPrivateMessage, fetchPrivateMessages } = require("../controllers/chatsController");

// Router instance
const chatRouter = Router();

// Send private message
chatRouter.route("/private-message").post(authentication, sendPrivateMessage);

// Get private messages
chatRouter.route("/private-message/:receiverId").get(authentication, fetchPrivateMessages);

module.exports = chatRouter;