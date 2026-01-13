const crypto = require("crypto");

// Generate code for account activation and password resets with expiry time
const generateCode = (length = 9) => {
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"; 

    // Generate code
    let code = "";
    const bytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) 
    {
        code += alphabet[bytes[i] % alphabet.length];
    }    

    // Return payload
    return { code };
};

module.exports = generateCode;