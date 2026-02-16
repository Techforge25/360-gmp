const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { sendPrivateMessage, fetchPrivateMessages, fetchMyConversations } = require("../controllers/chatsController");
const { checkSubscription } = require("../middlewares/checkSubscription");

// Router instance
const chatRouter = Router();

// Authentication required
chatRouter.use(authentication);

// Send private message
chatRouter.route("/private-message").post(checkSubscription, sendPrivateMessage);

// Get private messages
chatRouter.route("/private-message").get(fetchPrivateMessages);

// Get private messages
chatRouter.route("/my-conversations").get(fetchMyConversations);

module.exports = chatRouter;