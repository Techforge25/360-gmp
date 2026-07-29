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

        // Get HTML template
        const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/cancelSubscriptionOTPEmail.html"), "utf-8");

        // Replace placeholder
        const filledHtml = html.replaceAll('{{otp}}', otp); 

        // Execute
        const result = await sendEmail(email, "Cancel Subscription Request", filledHtml);        
        if(!result) throw new ApiError(500, "Failed to send cancel subscription OTP");
    }      

    // Send invitation to admin
    if(job.name === "sendInvitationToAdmin")
    {
        const { username, email, password } = job.data;

        // Execute
        const result = await sendEmail(email, "Admin Invitation", `Here is your admin credentials!
            <b> Username: ${username} </b> <br /> <br />
            <b> Password: ${password} </b>
        `);        
        if(!result) throw new ApiError(500, "Failed to send invitation email to admin");
    }      
}, { connection: redisConfigOptions, concurrency: 5 });

// Attach events
worker.on("completed", (job) => console.log(`Job completed!`, job.id, job.name, job.data));
worker.on("failed", (job, error) => console.log(`Job failed!`, job.id, job.name, job.data, error));