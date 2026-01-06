const getMonthlySubscriptionDates = () => {
    const startDate = new Date();
    const endDate = new Date(startDate);
    
    endDate.setMonth(endDate.getMonth() + 1);
    return { startDate, endDate };
};

module.exports = getMonthlySubscriptionDates;