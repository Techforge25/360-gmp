// Port and environment
const port = process.env.PORT || 8000;
const isLocal = process.env.NODE_ENV === "local";
const isProduction = process.env.NODE_ENV === "production";

// Cors options
const corsOptions = {
    origin:[process.env.FRONTEND_URL, "http://localhost:3000", "http://192.168.1.14:3000", "http://192.168.1.10:3000"],
    credentials:true,
    methods:["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders:["Content-Type", "Authorization"]
};

// Cookie options
const cookieOptions = {
    httpOnly:true,
    secure: !isLocal,
    signed: true,
    maxAge: 1000 * 60 * 60 * 24 * 90,
    sameSite: isLocal ? "lax" : "none",
    domain: isProduction ? ".techforgeinnovations.com" : undefined
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
    isLocal,
    isProduction,
    corsOptions,
    cookieOptions,
    emptyList,
    allowedNotificationTypes
};