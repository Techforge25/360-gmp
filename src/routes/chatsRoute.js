const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { sendPrivateMessage, fetchPrivateMessages, fetchThreads, markAsRead } = require("../controllers/chatsController");
const { checkSubscription } = require("../middlewares/checkSubscription");
const { validateChatPayload, validateConversationId } = require("../middlewares/chatMiddleware");

// Router instance
const chatRouter = Router();

// Authentication & subscription required
chatRouter.use(authentication, authorization(["user", "business"]), checkSubscription);

// Send private message
chatRouter.route("/").post(validateChatPayload, validateConversationId, sendPrivateMessage);

// Fetch threads
chatRouter.route("/").get(fetchThreads);

// Fetch private messages
chatRouter.route("/:recipientId").get(fetchPrivateMessages);

// Mark messages as read
chatRouter.route("/markAsRead/:conversationId").patch(markAsRead);

module.exports = chatRouter;