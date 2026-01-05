const port = process.env.PORT || 8000;
const isProduction = process.env.NODE_ENV === "production";

const corsOptions = {
    origin:[process.env.ORIGIN],
    credentials:true,
    methods:["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders:["Content-Type", "Authorization"]
};

const cookieOptions = {
    httpOnly:true,
    secure:true,
    maxAge: 1000 * 60 * 60 * 24 * 7,
    signed:true,
    sameSite:"none"
};

module.exports = {
    port,
    isProduction,
    corsOptions,
    cookieOptions,
};