const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const path = require("path");
const { corsOptions, port } = require("./constants");
const compression = require("compression");
const errorHandler = require("./middlewares/errorHandler");
const passport = require("passport");
require("./service/social-auth");
const morgan = require("morgan");
const app = express();

// Middlewares
app.use(cors(corsOptions));
app.use(cookieParser(process.env.COOKIE_PARSER_SECRET));
app.set("trust proxy", 1);
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(express.json({ limit: "50kb" }));
app.use(passport.initialize());
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
const customOfferRouter = require("./routes/customOfferRoute");
const socialLinkRouter = require("./routes/socialLinkRoute");
const businessProfileManagementRouter = require("./routes/businessProfileMangementRoute");
const categoryRouter = require("./routes/categoryRouter");
const savedJobRouter = require("./routes/savedJobsRoute");
const reportRouter = require("./routes/reportRouter");
const notificationsRouter = require("./routes/notificationsRoute");
const analyticsOverviewRouter = require("./routes/analyticsOverviewRoute");
const supportRouter = require("./routes/supportRoute");
const userSearchesRouter = require("./routes/userSearchesRoute");
const testimonialRouter = require("./routes/testimonialRoute");
const galleryRouter = require("./routes/galleryRoute");
const communityMembershipRouter = require("./routes/communityMembershipRoute");
const disputeRouter = require("./routes/disputeRoute");

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
app.use("/api/v1/customOffer", customOfferRouter);
app.use("/api/v1/socialLinks", socialLinkRouter);
app.use("/api/v1/business-profile-management", businessProfileManagementRouter);
app.use("/api/v1/category", categoryRouter);
app.use("/api/v1/savedJob", savedJobRouter);
app.use("/api/v1/report", reportRouter);
app.use("/api/v1/notifications", notificationsRouter);
app.use("/api/v1/analytics-overview", analyticsOverviewRouter);
app.use("/api/v1/support", supportRouter);
app.use("/api/v1/userSearches", userSearchesRouter);
app.use("/api/v1/testimonials", testimonialRouter);
app.use("/api/v1/gallery", galleryRouter);
app.use("/api/v1/community-membership", communityMembershipRouter);
app.use("/api/v1/dispute", disputeRouter);

// Import Admin Routes
const adminAuthRouter = require("./routes/admin/adminAuthRoute");
const dashboardRouter = require("./routes/admin/dashboardRoute");

// Registered Admin Routes
app.use("/api/v1/admin/auth", adminAuthRouter);
app.use("/api/v1/admin/dashboard", dashboardRouter);

// API status route
app.get("/", (request, response) => response.send(`Server is up and running at port ${port}`));

// Error handling middleware
app.use(errorHandler);

module.exports = app;