// Port and environment
const port = process.env.PORT || 8000;
const isProduction = process.env.NODE_ENV === "production";

// Cors options
const corsOptions = {
    origin:[process.env.FRONTEND_URL, "http://localhost:3000", "http://localhost:5173"],
    credentials:true,
    methods:["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders:["Content-Type", "Authorization"]
};

// Cookie options
// const cookieOptions = {
//     httpOnly:true,
//     secure: isProduction,
//     signed: true,
//     maxAge: 1000 * 60 * 60 * 24 * 90,
//     sameSite: isProduction ? "none" : "lax",
//     domain: isProduction ? ".techforgeinnovations.com" : undefined
// };

// Cookie options
const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "local" ? false : true,
    signed: true,
    maxAge: 1000 * 60 * 60 * 24 * 90,
    sameSite: process.env.NODE_ENV === "local" ? "none" : "none",
    domain: process.env.NODE_ENV === "local" ? undefined : ".techforgeinnovations.com"
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
    corsOptions,
    cookieOptions,
    emptyList,
    allowedNotificationTypes
};