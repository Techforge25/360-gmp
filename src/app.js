const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { corsOptions } = require("./constants");
const compression = require("compression");
const errorHandler = require("./middlewares/errorHandler");

const app = express();

// Middlewares
app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_PARSER_SECRET));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.json({ limit: "20kb" }));
app.use("/public", express.static(path.resolve("public")));
app.use(compression());

// Import Routes
const authRouter = require("./routes/auth");
const planRouter = require("./routes/plan");

// Registered Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/plan", planRouter);

// Error handling middleware
app.use(errorHandler);

module.exports = app;