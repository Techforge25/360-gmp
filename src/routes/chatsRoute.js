const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { sendPrivateMessage } = require("../controllers/chatsController");

// Router instance
const chatRouter = Router();

// Send private message
chatRouter.route("/private-message").post(authentication, sendPrivateMessage);

module.exports = chatRouter;