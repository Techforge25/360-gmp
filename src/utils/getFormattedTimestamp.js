const getFormattedTimestamp = (timestamp) => {
    const date = new Date(timestamp).toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
        timeZoneName: "short"
    });    
    return date;
};

module.exports = getFormattedTimestamp;