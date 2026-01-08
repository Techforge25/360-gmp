const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { corsOptions } = require("./constants");
const compression = require("compression");
const errorHandler = require("./middlewares/errorHandler");
const morgan = require("morgan");
const app = express();

// Middlewares
app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_PARSER_SECRET));
app.use(express.urlencoded({ extended: true, limit: "20kb" }));
app.use(express.json({ limit: "20kb" }));
app.use("/public", express.static(path.resolve("public")));
app.use(compression());
app.use(morgan("dev"));

// Import Routes
const authRouter = require("./routes/auth");
const planRouter = require("./routes/plan");
const subscriptionRouter = require("./routes/subscription");
const userProfileRouter = require("./routes/userProfile");
const businessProfileRouter = require("./routes/businessProfileRoute");
const productsRouter = require("./routes/productsRoute");
const jobsRouter = require("./routes/jobsRoute");
const communityRouter = require("./routes/communityRoute");
const communityPostRouter = require("./routes/communityPost");
const jobApplicationRouter = require("./routes/jobApplicationRoute");
const orderRouter = require("./routes/ordersRoute");
const walletRouter = require("./routes/walletRoute");
const chatRouter = require("./routes/chatsRoute");

// Registered Routes
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/plan", planRouter);
app.use("/api/v1/subscription", subscriptionRouter);
app.use("/api/v1/userProfile", userProfileRouter);
app.use("/api/v1/businessProfile", businessProfileRouter);
app.use("/api/v1/products", productsRouter);
app.use("/api/v1/jobs", jobsRouter);
app.use("/api/v1/community", communityRouter);
app.use("/api/v1/community-posts", communityPostRouter);
app.use("/api/v1/jobApplication", jobApplicationRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/wallet", walletRouter);
app.use("/api/v1/chats", chatRouter);

// Error handling middleware
app.use(errorHandler);

module.exports = app;