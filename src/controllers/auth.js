const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const validate = require("../utils/validate");
const { userSignupSchema } = require("../validations/user");

// User signup
const userSignup = asyncHandler((request, response) => {
    // const { email, passwordHash } = request.body;
    // if(!email) throw new ApiError(400, "Email is required");
    // if(!passwordHash) throw new ApiError(400, "Password is required");

    const { email, passwordHash } = validate(userSignupSchema, request.body);
    console.log(email);
    console.log(passwordHash);

    return response.status(201).json(new ApiResponse(201, null, "Signup successful"));
});

module.exports = { userSignup };