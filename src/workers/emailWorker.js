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
              
        // Get HTML template
        const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/signupOTPEmail.html"), "utf-8");

        // Replace placeholders
        const filledHtml = html
        .replaceAll('{{email}}', email)
        .replaceAll('{{accountVerificationToken}}', accountVerificationToken);     

        // Execute
        const result = await sendEmail(email, "Account Activation Token", filledHtml);
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

        // Execute
        const result = await sendEmail(email, "Password Reset Request", filledHtml);        
        if(!result) throw new ApiError(500, "Failed to send password reset email");
    }    

    // Send Reset password email
    if(job.name === "sendCancelSubscriptionOTPEmail")
    {
        const { email, otp } = job.data;

        // Execute
        const result = await sendEmail(email, "Cancel Subscription Verification Code", `
            <p>Hello,</p>

            <p>We received a request to cancel your subscription.</p>

            <p>Please use the verification code below to continue:</p>

            <h2 style="letter-spacing:2px;">${otp}</h2>

            <p>This code will expire in 5 minutes.</p>

            <p>If you did not request to cancel your subscription, you can safely ignore this email.</p>

            <p>Regards,<br> 360-GMP </p>
        `);    
        if(!result) throw new ApiError(500, "Failed to send password reset email");
    }      
}, { connection: redisConfigOptions, concurrency: 5 });

// Attach events
worker.on("completed", (job) => console.log(`Job completed!`, job.id, job.name, job.data));
worker.on("failed", (job, error) => console.log(`Job failed!`, job.id, job.name, job.data, error));