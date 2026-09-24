const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { sendPrivateMessage } = require("../controllers/chatsController");
const { checkSubscription } = require("../middlewares/checkSubscription");

// Router instance
const chatRouter = Router();

// Authentication required
chatRouter.use(authentication, checkSubscription);

// Send private message
chatRouter.route("/").post(sendPrivateMessage);

module.exports = chatRouter;