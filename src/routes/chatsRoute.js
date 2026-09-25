const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { sendPrivateMessage } = require("../controllers/chatsController");
const { checkSubscription } = require("../middlewares/checkSubscription");
const { validateChatPayload, validateConversationId } = require("../middlewares/chatMiddleware");

// Router instance
const chatRouter = Router();

// Authentication & subscription required
chatRouter.use(authentication, authorization(["user", "business"]), checkSubscription);

// Send private message
chatRouter.route("/").post(validateChatPayload, validateConversationId, sendPrivateMessage);

module.exports = chatRouter;