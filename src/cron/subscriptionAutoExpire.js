const cron = require("node-cron");
const Subscription = require("../models/subscription");

// Runs daily at 12:00 AM, 6:00 AM, 12:00 PM, and 6:00 PM
const timer = "0 0,6,12,18 * * *";

// Auto exprire subscription
cron.schedule(timer, async () => {
    console.log("Running auto expire subscription job");
    await Subscription.updateMany(
        { status: "active", endDate: { $lte: new Date() } }, 
        { $set: { status: "expired" } }
    );
});