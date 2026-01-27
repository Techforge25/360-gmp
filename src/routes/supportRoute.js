const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { supportEmail, fetchAllSupportEmails, fetchMySupportEmails } = require("../controllers/supportController");

// Router instance
const supportRouter = Router();

// Send support email / fetch all support emails
supportRouter.route("/email")
.post(authentication, authorization(["user", "business"]), supportEmail)
.get(authentication, authorization(["admin"]), fetchAllSupportEmails);

// Fetch my support email
supportRouter.route("/my-emails")
.get(authentication, authorization(["user", "business"]), fetchMySupportEmails);

module.exports = supportRouter;