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
        console.log("okay.....", cookie.parseCookie(rawCookies));
        console.log("Parsed cookies:", parsedCookies);
        if(!parsedCookies) return next();

        // Extract access token
        let accessToken = parsedCookies.accessToken;
        if(accessToken?.startsWith("s:"))
        {
            // Remove "s:" prefix and signature
            accessToken = cookieParser.signedCookie(accessToken, process.env.COOKIE_PARSER_SECRET);
        }

        if(!accessToken) return next();

        // Verify token
        const user = verifyAccessToken(accessToken);
        console.log("Decoded payload:", user);
        if(!user) return next();

        // Inject user
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