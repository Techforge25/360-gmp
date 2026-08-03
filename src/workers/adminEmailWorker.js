const { Worker } = require("bullmq");
const { redisConfigOptions } = require("../redis/connection");
const sendEmail = require("../service/email");
const ApiError = require("../utils/ApiError");
const fs = require("fs");
const path = require("path");

// Admin Email Worker
const worker = new Worker("adminEmailQueue", async (job) => {   
    // Send invitation to admin
    if(job.name === "sendInvitationToAdmin")
    {
        const { username, email, password, allowedModules } = job.data;

        // Get HTML template
        const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/sendInvitationEmail.html"), "utf-8");

        // Map modules
        const modulesList = allowedModules.map(module => `<li> ${module} </li>`).join("");

        // Replace placeholders
        const filledHtml = html
        .replaceAll("{{username}}", username)
        .replaceAll("{{email}}", email)
        .replaceAll("{{password}}", password)
        .replaceAll("{{allowedModules}}", `<ul style="margin:8px 0 0 20px; padding:0;">${modulesList}</ul>`);        

        // Execute
        const result = await sendEmail(email, "360-GMP Admin Account Credentials", filledHtml);        
        if(!result) throw new ApiError(500, "Failed to send admin invitation email");        
    }     
    
    // Send email to admin upon details updation
    if(job.name === "sendEmailOnAdminDetailsUpdation")
    {
        const { email, username, allowedModules } = job.data;

        // Get HTML template
        const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/updateAdminDetails.html"), "utf-8");

        // Map modules
        const modulesList = allowedModules.map(module => `<li> ${module} </li>`).join("");

        // Replace placeholders
        const filledHtml = html
        .replaceAll("{{username}}", username)
        .replaceAll("{{allowedModules}}", `<ul style="margin:8px 0 0 20px; padding:0;">${modulesList}</ul>`);        

        // Execute
        const result = await sendEmail(email, "360-GMP Update Admin Details", filledHtml);        
        if(!result) throw new ApiError(500, "Failed to send email for admin details updation");        
    }  
    
    // Send email to admin on password updation
    if(job.name === "sendEmailOnPasswordChange")
    {
        const { email, password } = job.data;

        // Get HTML template
        const html = fs.readFileSync(path.resolve(__dirname, "../../public/templates/updatePasswordEmailTemplate.html"), "utf-8");


        // Replace placeholders
        const filledHtml = html.replaceAll("{{password}}", password);        

        // Execute
        const result = await sendEmail(email, "360-GMP Admin Security Alert", filledHtml);        
        if(!result) throw new ApiError(500, "Failed to send email on admin password updation");        
    }     
}, { connection: redisConfigOptions, concurrency: 5 });

// Attach events
worker.on("completed", (job) => console.log(`Job completed!`, job.id, job.name, job.data));
worker.on("failed", (job, error) => console.log(`Job failed!`, job.id, job.name, job.data, error));