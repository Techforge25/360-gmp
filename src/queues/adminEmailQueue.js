const { Queue } = require("bullmq");
const { redisConfigOptions } = require("../redis/connection");

// Admin Email Queue
const adminEmailQueue = new Queue("adminEmailQueue", { 
    connection: redisConfigOptions, 
    defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: 1000,
        removeOnFail: 1000
    }
});

module.exports = adminEmailQueue;