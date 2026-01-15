const crypto = require("crypto");

// Generate numeric code (only digits)
const generateCode = (length = 9) => {
    const digits = "0123456789";
    let code = "";
    const bytes = crypto.randomBytes(length);

    for(let i = 0; i < length; i++) code += digits[bytes[i] % digits.length];
    

    return { code };
};

module.exports = generateCode;