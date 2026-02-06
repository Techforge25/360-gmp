const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/accessToken");

// Socket authentication
const socketAuthentication = (socket, next) => {
    try 
    {
        // Get token
        const { authToken } = socket.handshake.auth;
        if(!authToken) throw new ApiError(401, "Socket authentication error: Token is missing");

        // Verify token
        const user = verifyAccessToken(authToken);
        if(!user) throw new ApiError(401, "Socket authentication error: Invalid token");

        // Pass to connection
        socket.user = user || null;
        return next();
    } 
    catch (error) 
    {
        console.log(error.message);
    }
};

module.exports = socketAuthentication;