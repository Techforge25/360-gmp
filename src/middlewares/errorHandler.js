const ApiError = require("../utils/ApiError");

const errorHandler = (error, request, response, next) => {
    if(error instanceof ApiError)
    {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal Server Error";
        const success = error.success || false;
        const stack = process.env.NODE_ENV === "development" ? error.stack || "No stack trace found" : undefined

        return response.status(statusCode)
        .json({ statusCode, message, success, stack });
    }
    else
    {
        // Fallback for unexpected errors
        return response.status(500)
        .json({ 
            statusCode: 500, 
            message: error.message || "Something went wrong!", 
            success: false,
            stack: process.env.NODE_ENV === "development" ? error.stack || "No stack trace found" : undefined 
        });        
    }
};

module.exports = errorHandler;