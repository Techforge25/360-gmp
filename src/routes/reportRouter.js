const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");

// Router instance
const reportRouter = Router();

module.exports = reportRouter;