const { Worker } = require("bullmq");
const { redisConfigOptions } = require("../redis/connection");
const sendEmail = require("../service/email");
const ApiError = require("../utils/ApiError");
const fs = require("fs");
const path = require("path");

// Email Worker
const worker = new Worker("emailQueue", async (job) => {
    // Send OTP Email
    if(job.name === "sendOTPEmail")
    {
        const { email, accountVerificationToken } = job.data;       
        const result = await sendEmail(email, "Account Activation Token", 
            `<p>Your OTP Token is: <strong>${accountVerificationToken}</strong></p>
            <p>Please use this token to activate your account.</p>`
        );
        if(!result) throw new ApiError(500, "Failed to send OTP email");
    }

    // Send Reset password email
    if(job.name === "sendResetPasswordEmail")
    {
        const { email, resetToken } = job.data;

        // Get HTML template
        const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/forgotPasswordEmail.html"), "utf-8");

        // Replace placeholders
        const filledHtml = html
        .replaceAll('{{email}}', email)
        .replaceAll('{{resetToken}}', resetToken); 

        const result = await sendEmail(email, "Password Reset Request", filledHtml);        
        if(!result) throw new ApiError(500, "Failed to send password reset email");
    }    
}, { connection: redisConfigOptions, concurrency: 5 });

// Attach events
worker.on("completed", (job) => console.log(`Job completed!`, job.id, job.name, job.data));
worker.on("failed", (job, error) => console.log(`Job failed!`, job.id, job.name, job.data, error));