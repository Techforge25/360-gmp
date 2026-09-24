const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { sendPrivateMessage } = require("../controllers/chatsController");
const { checkSubscription } = require("../middlewares/checkSubscription");
const { getSenderInfo } = require("../middlewares/chatMiddleware");

// Router instance
const chatRouter = Router();

// Authentication required
chatRouter.use(authentication, checkSubscription);

// Send private message
chatRouter.route("/").post(getSenderInfo, sendPrivateMessage);

module.exports = chatRouter;