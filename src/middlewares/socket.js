const jwt = require("jsonwebtoken");
const ApiError = require("../utils/ApiError");
const { verifyAccessToken } = require("../utils/accessToken");

// Socket authentication
const socketAuthentication = (socket, next) => {
    try 
    {
        const { authToken } = socket.handshake.auth;
        if(!authToken) throw new ApiError(401, "Auth token is missing");

        const user = verifyAccessToken(authToken);
        socket.user = user || null;
        return next();
    } 
    catch (error) 
    {
        console.log(error.message);
    }
};

module.exports = socketAuthentication;