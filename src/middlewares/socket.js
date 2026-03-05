const { verifyAccessToken } = require("../utils/accessToken");
const cookieParser = require("cookie-parser");
const cookie = require("cookie");

// Socket authentication
const socketAuthentication = (socket, next) => {
    try 
    {
        // Get cookies
        const rawCookies = socket.handshake.headers.cookie;
        if(!rawCookies) return next();

        // Parse cookie
        const parsedCookies = cookie.parse(rawCookies);
        if(!parsedCookies) return next();

        // Extract access token and remove "s:" prefix and signature
        let accessToken = parsedCookies.accessToken;
        if(accessToken?.startsWith("s:")) accessToken = cookieParser.signedCookie(accessToken, process.env.COOKIE_PARSER_SECRET);
        if(!accessToken) return next();

        // Verify token
        const user = verifyAccessToken(accessToken);
        if(!user) return next();

        // Inject user
        console.log("User payload:", user);
        socket.user = user;
        return next();
    } 
    catch(error) 
    {
        console.log("Socket auth error:", error.message);
        return next();
    }
};

module.exports = socketAuthentication;