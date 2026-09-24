const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
// const {  } = require("../controllers/chatsController");
const { checkSubscription } = require("../middlewares/checkSubscription");

// Router instance
const chatRouter = Router();

// Authentication required
chatRouter.use(authentication, checkSubscription);


module.exports = chatRouter;