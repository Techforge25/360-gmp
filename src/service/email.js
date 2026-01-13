const nodemailer = require("nodemailer");
const { GMAIL, GMAIL_APP_PASSWORD } = process.env;

// Configure transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: GMAIL,
        pass: GMAIL_APP_PASSWORD
    }
});

// Send email
const sendEmail = async (to, subject, text) => {
    const mailOptions = {
        from: GMAIL,
        to:to,
        subject:subject,
        html:text
    }

    try 
    {
        const result = await transporter.sendMail(mailOptions);
        return result;
    } 
    catch(error) 
    {
        console.log(error.message);
        return null;
    }
}

module.exports = sendEmail;