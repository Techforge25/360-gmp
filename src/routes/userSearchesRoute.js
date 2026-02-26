const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createUserSearch, fetchSingleUserSearches, fetchMySearches } = require("../controllers/userSearchesController");

// Router instance
const userSearchesRouter = Router();

// Create user search
userSearchesRouter.route("/")
.post(authentication, createUserSearch);

// Fetch single user searches
userSearchesRouter.route("/user/:userId")
.get(authentication, authorization(["admin"]), fetchSingleUserSearches)

// Fetch my searhces
userSearchesRouter.route("/my")
.get(authentication, authorization(["user", "business"]), fetchMySearches);

module.exports = userSearchesRouter;