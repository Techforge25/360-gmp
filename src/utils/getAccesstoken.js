const getAccessToken = (request) => {
    if(!request) return null;
    try
    {
        const accessToken = request.cookies?.accessToken || request.signedCookies?.accessToken || request.headers['authorization']?.split(" ")?.[1];
        return accessToken;
    }
    catch(error)
    {
        console.log("Failed to extract access token", error.message);
        return null;
    }
};

module.exports = getAccessToken;