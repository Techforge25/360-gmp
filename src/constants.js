// Port and environment
const port = process.env.PORT || 8000;
const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.NODE_ENV === "staging";
const isLocal = process.env.NODE_ENV === "local";


// Dynamic frontend url based on node environemnt
let frontendURL = null;
if(isProduction) frontendURL = "https://360-gmp-front-end.vercel.app";
if(isStaging) frontendURL = "https://360-gmp-front-end-git-staging-aftabs-projects-80f407ba.vercel.app";
if(isLocal) frontendURL = "http://localhost:3000";

// Cors options
const corsOptions = {
    origin:[frontendURL, process.env.FRONTEND_URL, "http://localhost:3000"],
    credentials:true,
    methods:["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders:["Content-Type", "Authorization"]
};

// Cookie options
const cookieOptions = {
    httpOnly: true,
    secure: isLocal ? false : true,
    signed: true,
    maxAge: 1000 * 60 * 60 * 24 * 90,
    sameSite: isLocal ? "lax" : "none",
    // domain: isProduction ? ".techforgeinnovations.com" : undefined
};

// Empty list
const emptyList = { 
    docs:[], 
    totalPages:0, 
    totalDocs:0, 
    limit:0, 
    page:0, 
    pagingCounter:0, 
    hasPrevPage:false, 
    hasNextPage:false, 
    prevPage:null, 
    nextPage:null 
};

// Notification types
const allowedNotificationTypes = ["System", "UserProfile", "BusinessProfile"];

module.exports = {
    port,
    isProduction,
    isStaging,
    isLocal,
    frontendURL,
    corsOptions,
    cookieOptions,
    emptyList,
    allowedNotificationTypes
};