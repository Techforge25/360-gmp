const { verifyAccessToken } = require("../utils/accessToken");
const cookie = require("cookie");

// Socket authentication
const socketAuthentication = (socket, next) => {
    try 
    {
        // Get cookies
        const rawCookies = socket.handshake.headers.cookie;
        console.log("socket.handshake.headers:", socket.handshake.headers);
        console.log("Raw cookies:", rawCookies);
        if(!rawCookies) return next();

        // Parse cookie
        const parsedCookies = cookie.parse(rawCookies);
        console.log("Parsed cookies:", parsedCookies);
        if(!parsedCookies) return next();

        // Extract access token
        const accessToken = parsedCookies.accessToken;
        console.log("accessToken:", accessToken);
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