const { verifyAccessToken } = require("../utils/accessToken");
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
        const accessToken = parsedCookies.accessToken;
        if(!accessToken) return next();

        // Verify token
        const user = verifyAccessToken(accessToken);
        if(!user) return next();

        // Inject user
        socket.user = user;
        return next();
    } 
    catch(error) 
    {
        console.log("Socket auth error:", error.message);

        // Never block connection
        return next();
    }
};

module.exports = socketAuthentication;