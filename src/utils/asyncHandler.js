const asyncHandler = (fn) => {
    return async (request, response, next) => {
        try 
        {
            await fn(request, response, next);
        } 
        catch(error) 
        {
            return next(error);
        }
    };
};

module.exports = asyncHandler;