// Port and environment
const port = process.env.PORT || 8000;
const isProduction = process.env.NODE_ENV === "production";

// Cors options
const corsOptions = {
    origin:[process.env.ORIGIN, "http://localhost:3000"],
    credentials:true,
    methods:["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders:["Content-Type", "Authorization"]
};

// Cookie options
const cookieOptions = {
    httpOnly:true,
    // secure:true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    signed:true,
    sameSite:"none"
};

// Empty list
const emptyList = { docs:[], totalPages:0, totalDocs:0 };

module.exports = {
    port,
    isProduction,
    corsOptions,
    cookieOptions,
    emptyList
};