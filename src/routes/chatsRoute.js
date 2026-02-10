const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { sendPrivateMessage, fetchPrivateMessages } = require("../controllers/chatsController");

// Router instance
const chatRouter = Router();

// Authentication required
chatRouter.use(authentication);

// Send private message
chatRouter.route("/private-message").post(sendPrivateMessage);

// Get private messages
chatRouter.route("/private-message").get(fetchPrivateMessages);

module.exports = chatRouter;