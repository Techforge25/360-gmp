const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createReport } = require("../controllers/reportController");

// Router instance
const reportRouter = Router();

// Create report
reportRouter.route("/")
.post(authentication, authorization(["user"]), createReport);

module.exports = reportRouter;