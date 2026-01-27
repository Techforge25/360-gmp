const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { supportEmail } = require("../controllers/supportController");

// Router instance
const supportRouter = Router();

// Support email
supportRouter.route("/email")
.post(authentication, supportEmail);

module.exports = supportRouter;