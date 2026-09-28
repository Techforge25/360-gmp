const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { sendPrivateMessage, fetchPrivateMessages, fetchThreads } = require("../controllers/chatsController");
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

module.exports = chatRouter;