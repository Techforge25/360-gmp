const getMonthlySubscriptionDates = (baseDate = new Date()) => {
    const startDate = baseDate;
    const endDate = new Date(baseDate);
    endDate.setMonth(endDate.getMonth() + 1);

    return { startDate, endDate };
};

module.exports = getMonthlySubscriptionDates;