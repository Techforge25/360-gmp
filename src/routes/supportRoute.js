const { Router } = require("express");
const { authentication } = require("../middlewares/auth");
const { supportEmail, fetchAllSupportEmails } = require("../controllers/supportController");

// Router instance
const supportRouter = Router();

// Send support email / fetch all support emails
supportRouter.route("/email")
.post(authentication, supportEmail)
.get(authentication, fetchAllSupportEmails);

module.exports = supportRouter;