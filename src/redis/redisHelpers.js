const { redis } = require("./connection");

// Set Cache
const setCache = async (key, value, minutes = 1) => {
    if(!key || value === undefined || value === null) return false;

    try 
    {
        // Remove old data for extra safety check
        const isExist = await redis.exists(key);
        if(isExist) await redis.del(key);

        // Set new string
        await redis.set(key, JSON.stringify(value), "EX", minutes * 60);
        return true;
    } 
    catch (error) 
    {
        console.log("Failed to set cache", error.message);
        return false;
    }
};

// Get Cache
const getCache = async (key) => {
    if(!key) return null;

    try 
    {
        const data = await redis.get(key);
        return JSON.parse(data);
    } 
    catch(error) 
    {
        console.log("Failed to get cache", error.message);
        return null;
    }
};

// Delete Cache
const deleteCache = async (key) => {
    if(!key) return false;

    try 
    {
        const isExist = await redis.exists(key);
        if(!isExist) return false;
        await redis.del(key);
        return true;
    } 
    catch(error) 
    {
        console.log("Failed to delete cache", error.message);
        return false;
    }
};

// Delete cache by pattern
const deleteCacheByPattern = async (pattern) => {
    if(!pattern) return false;

    try 
    {
        const keys = await redis.keys(pattern);
        if(keys.length === 0) return false;

        await redis.del(...keys);
        return true;
    }
    catch(error)
    {
        console.log("Failed to delete cache by pattern", error.message);
        return false;
    }
};

module.exports = { setCache, getCache, deleteCache, deleteCacheByPattern };