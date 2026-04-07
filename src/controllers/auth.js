const { isValidObjectId } = require("mongoose");
const { cookieOptions } = require("../constants");
const BusinessProfile = require("../models/businessProfileSchema");
const UserProfile = require("../models/userProfile");
const User = require("../models/users");
const sendEmail = require("../service/email");
const { generateAccessToken, getRefreshToken, verifyRefreshToken, generateRefreshToken } = require("../utils/accessToken");
const ApiError = require("../utils/ApiError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const generateCode = require("../utils/generateCode");
const { getUserProfile, getBusinessProfile } = require("../utils/getProfiles");
const sendNotification = require("../utils/sendNotification");
const validate = require("../utils/validate");
const forgotPasswordSchema = require("../validations/forgotPasswordValidator");
const resetPasswordSchema = require("../validations/resetPasswordValidator");
const { userSignupValidator, userLoginValidator } = require("../validations/user");
const verifyPasswordResetTokenSchema = require("../validations/verifyPasswordResetTokenValidator");
const bcrypt = require("bcrypt");

// User signup
const userSignup = asyncHandler(async (request, response) => {
    // Validate
    const { email, passwordHash } = validate(userSignupValidator, request.body) || {};

    // Check if email exist
    const user = await User.findOne({ email: email.toLowerCase() }).select("_id email status").lean();
    if(user)
    {
        if(user.status === "pending")
        {
            throw new ApiError(400, "Your account is not activated yet. Please verify your identity via OTP.");
        }
        else
        {
            throw new ApiError(400, "This email has already been taken");
        }
    }
    

    // Generate OTP token
    const { code:accountVerificationToken } = generateCode(6);
    if(!accountVerificationToken) throw new ApiError(500, "Failed to generate OTP");

    // Create user
    const createdUser = await User.create({ 
        email, 
        passwordHash, 
        role:null,
        accountVerificationToken,
        accountVerificationTokenExpires: Date.now() + 1 * 60 * 1000
    });
    if(!createdUser) throw new ApiError(500, "Unable to signup");    

    // Send email
    const result = await sendEmail(createdUser.email, "Account Activation Token", 
    `<p>Your OTP Token is: <strong>${accountVerificationToken}</strong></p>
    <p>Please use this token to activate your account.</p>`
    );
    if(!result) throw new ApiError(500, "Failed to send password reset email");

    // Response
    return response.status(200).json(new ApiResponse(200, createdUser._id, "Signup successful! We have sent you an OTP to your email"));     
});

// Resend OTP token for account verification
const resendOTPToken = asyncHandler(async (request, response) => {
    const { email } = request.body || {};
    if(!email) throw new ApiError(400, "Email is required");
    const validEmail = email.toLowerCase();

    // Find user
    const user = await User.findOne({ email: validEmail });
    if(!user) throw new ApiError(404, "User not found associated with this email");
    if(user.status !== "pending") throw new ApiError(400, "Your account is already activated");

    // Generate new OTP token
    const { code:accountVerificationToken } = generateCode(6);
    if(!accountVerificationToken) throw new ApiError(500, "Failed to generate OTP");

    // Update user with new OTP token
    user.accountVerificationToken = accountVerificationToken;

    // Send email
    const result = await sendEmail(validEmail, "Account Activation Token", 
        `<p>Your OTP Token is: <strong>${accountVerificationToken}</strong></p>
        <p>Please use this token to activate your account.</p>`
        );
    if(!result) throw new ApiError(500, "Failed to send OTP");

    // Set timer
    user.accountVerificationTokenExpires = Date.now() + 1 * 60 * 1000;
    await user.save();    

    // Response
    return response.status(200).json(new ApiResponse(200, user._id, "We have re-sent you an OTP to your email"));         
});

// Verify OTP
const verifyOTP = asyncHandler(async (request, response) => {
    const { userId, accountVerificationToken } = request.body || {};

    // Validate
    if(!userId) throw new ApiError(400, "User ID is missing");
    if(!isValidObjectId(userId)) throw new ApiError(400, "User ID is not a valid MongoDB ID");
    if(!accountVerificationToken) throw new ApiError(400, "OTP Token is missing");

    // Find user
    const user = await User.findById(userId);
    if(!user) throw new ApiError(404, "User not found!");

    // Verify otp token
    if(user.accountVerificationToken !== accountVerificationToken) throw new ApiError(400, "Invalid OTP");
    if(user.accountVerificationTokenExpires < Date.now()) throw new ApiError(400, "This OTP has been expired! Request new one");

    // Save to db
    user.accountVerificationToken = null;
    user.accountVerificationTokenExpires = null;
    user.status = "active";
    await user.save();

    // Send notification to user upon account creation
    await sendNotification({
        userOwnerId:userId,
        title: "Welcome to 360-GMP 🎉",  
        content: `Your account has been successfully verified. Welcome to 360-GMP! You can now explore features, connect with others, and start using the platform.`,
        type: "system",
        io: request.app.get("io")
    });

    // Response
    return response.status(200).json(new ApiResponse(200, user.email, "Your account has been activated"));
});

// User login
const userLogin = asyncHandler(async (request, response) => {
    const { email, passwordHash } = validate(userLoginValidator, request.body) || {};

    const [user] = await User.aggregate([
        // Match
        { $match:{ email } },

        // Lookup inside user profile
        {
            $lookup:{
                from:"userprofiles",
                localField:"_id",
                foreignField:"userId",
                as:"userProfile"
            }
        },

        // Lookup inside business profile
        {
            $lookup:{
                from:"businessprofiles",
                localField:"_id",
                foreignField:"ownerUserId",
                as:"businessProfile"
            }
        },

        // $unwind
        { $unwind:{ path:"$userProfile", preserveNullAndEmptyArrays:true } },
        { $unwind:{ path:"$businessProfile", preserveNullAndEmptyArrays:true } },
        
        // Projection
        {
            $project:{
                email:1, 
                passwordHash:1,
                status:1,
                role:1,
                refreshToken:1,
                userProfileId: { $ifNull:["$userProfile._id", null] },
                businessProfileId: { $ifNull:["$businessProfile._id", null] }
            }
        }
    ]);
    if(!user) throw new ApiError(400, "Invalid email or password");

    // Match password
    const isMatched = await bcrypt.compare(passwordHash, user.passwordHash);
    if(!isMatched) throw new ApiError(400, "Invalid email or password");

    // Only approved account can log in
    if(user.status === "pending") throw new ApiError(400, "Your account is not activated yet. Please verify your identity via OTP.");
    if(user.status === "flagged") throw new ApiError(400, "Your account is flagged. You cannot log-in to your account");    

    // Generate access token & refresh tokens
    const accessToken = generateAccessToken({ 
        _id:user._id, 
        role:user.role, 
        profiles: {
            businessProfileId: user.businessProfileId,
            userProfileId: user.userProfileId
        }
    });
    const refreshToken = generateRefreshToken({ _id:user._id });

    // Validate
    if(!accessToken) throw new ApiError(500, "Failed to generate access token");
    if(!refreshToken) throw new ApiError(500, "Failed to generate refresh token");

    // Save to db
    await User.updateOne({ _id: user._id }, { $set: { refreshToken } });

    // Is new user flag
    const isNewUser = Boolean(!user.role);    

    // Response
    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { role:user.role, isNewToPlatform:isNewUser }, "Login successful"));
});

// Logout
const logout = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Clear refresh token from db
    const user = await User.findByIdAndUpdate(userId, { refreshToken:null }, { new:true, lean:true }).select("_id");
    if(!user) throw new ApiError(500, "Failed to clear refresh token from db"); 

    // Response
    return response.status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, null, "Logout successful"));
});

// Refresh access token
const refreshAccessToken = asyncHandler(async (request, response) => {
    // Get token
    const token = getRefreshToken(request);
    if(!token) throw new ApiError(401, "Unauthorized! Refresh token is missing");

    // Verify refresh token
    const payload = verifyRefreshToken(token);
    if(!payload) throw new ApiError(401, "Unauthorized! Invalid refresh token");

    // Find user
    const user = await User.findById(payload._id).select("_id role refreshToken");
    if(!user) throw new ApiError(404, "User not found associated with the provided refresh token");

    // Compare tokens
    if(user.refreshToken !== token) throw new ApiError(400, "Refresh token mismatch");

    // Fetch child profiles
    const [userProfile, businessProfile] = await Promise.all([
        UserProfile.findOne({ userId:user._id }).select("_id").lean(),
        BusinessProfile.findOne({ ownerUserId:user._id }).select("_id").lean()
    ]);

    // Generate tokens
    const accessToken = generateAccessToken({
        _id: user._id,
        role: user.role,
        profiles: {
            businessProfileId: businessProfile?._id || null,
            userProfileId: userProfile?._id || null
        }            
    });
    const refreshToken = generateRefreshToken({ _id: user._id });

    // Validate
    if(!accessToken) throw new ApiError(400, "Failed to re-generate access token");
    if(!refreshToken) throw new ApiError(400, "Failed to re-generate refresh token");

    // Save to db
    user.refreshToken = refreshToken;
    await user.save();

    // Response
    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, null, "Refresh token has been issued"));
});

// Switch role
const switchRole = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const role = request.query?.role || null;
    if(!role) throw new ApiError(400, "Role is required for switching a profile");
    if(role.toLowerCase() !== "user" && role.toLowerCase() !== "business") throw new ApiError(400, "Invalid role");

    // Check if user profile actually exist before switching
    if(role.toLowerCase() === "user")
    {
        const userProfile = await getUserProfile(userId);
        if(!userProfile) throw new ApiError(404, "User profile not found! Please create user profile first");
    }

    // Check if business profile actually exist before switching
    if(role.toLowerCase() === "business")
    {
        const businessProfile = await getBusinessProfile(userId);
        if(!businessProfile) throw new ApiError(404, "Business profile not found! Please create business profile first");
        if(request.user.planName === "TRIAL") throw new ApiError(403, "Switching to a business profile is not allowed while you are on a trial plan");
    }    

    // Save to db
    const user = await User.findByIdAndUpdate(userId, { role }, { new:true, lean:true }).select("_id role");
    if(!user) throw new ApiError(400, "Failed to update role in db.");

    // Find profiles
    const [businessProfile, userProfile] = await Promise.all([
        BusinessProfile.findOne({ ownerUserId:userId }).lean(),
        UserProfile.findOne({ userId }).lean()
    ]);

    // Payload based on role
    const profilePayload = user.role === "user" ? userProfile : businessProfile;    

    // Generate new token with updated role
    const accessToken = generateAccessToken({ 
        _id: userId, 
        role: role, 
        profiles: {
            businessProfileId: businessProfile?._id || null,
            userProfileId: userProfile?._id || null
        }
    });
    if(!accessToken) throw new ApiError(400, "Failed to re-generate access token");

    // Response
    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, { profilePayload }, `Access token has been refreshed! role has changed to ${role}`));
});

// Forgot password
const forgotPassword = asyncHandler(async (request, response) => {
    const { email } = validate(forgotPasswordSchema, request.body) || {};

    const user = await User.findOne({ email });
    if(!user) throw new ApiError(404, "User not found associated with this email");

    // Generate a reset token
    const { code:resetToken } = generateCode(6);
    if(!resetToken) throw new ApiError(500, "Failed to generate password reset token");

    // Save token to db
    user.passwordResetToken = resetToken;
    user.passwordResetTokenExpires = Date.now() + 5 * 60 * 1000; // 5 minutes from now
    await user.save();

    // Send email
    const result = await sendEmail(email, "Password Reset Request", 
    `<p>Your password reset token is: <strong>${resetToken}</strong></p>
    <p>Please use this token to reset your password.</p>`
    );

    if(!result) throw new ApiError(500, "Failed to send password reset email");
    return response.status(200).json(new ApiResponse(200, null, "Password reset token has been sent to your email"));
});

// Verify password reset token
const verifypasswordResetToken = asyncHandler(async (request, response) => {
    const { email, passwordResetToken } = validate(verifyPasswordResetTokenSchema, request.body);

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if(!user) throw new ApiError(404, "User not found associated with this email");

    // Validate token
    if(user.passwordResetToken !== passwordResetToken) throw new ApiError(400, "Invalid reset token");
    if(user.passwordResetTokenExpires < Date.now()) throw new ApiError(400, "Reset token has expired");

    // Response
    return response.status(200).json(new ApiResponse(200, passwordResetToken, "Password reset token verified successfully"));
});

// Reset password
const resetPassword = asyncHandler(async (request, response) => {
    const { newPassword } = validate(resetPasswordSchema, request.body);
    const { passwordResetToken } = request.params;

    // Find user
    const user = await User.findOne({ passwordResetToken }).select("passwordHash passwordResetToken passwordResetTokenExpires");
    if(!user) throw new ApiError(400, "Invalid reset token");
    if(user.passwordResetTokenExpires < Date.now()) throw new ApiError(400, "Reset token has expired");

    // Prevent restting password as old password
    const matchPassword = await user.matchPassword(newPassword);
    if(matchPassword) throw new ApiError(400, "Your new password cannot be the same as your previous password");

    // Update password
    user.passwordHash = newPassword;
    user.passwordResetToken = null;
    user.passwordResetTokenExpires = null;
    await user.save();

    // Send notification
    await sendNotification({
        userOwnerId: user._id,
        title: "Password Changed Successfully",
        content: "Your account password was just updated. If this wasn't you, please contact support immediately.",
        type: "security",
        io: request.app.get("io")
    });

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Password has been reset successfully"));
});

// Login as gmail
const googleLogin = async (request, response) => {
    if(!request.user) throw new ApiError(404, "User not found");

    // Get user id
    const userId = request.user._id;
    if(!userId) throw new ApiError(400, "Failed to fetch User ID on google login");

    // Find profiles
    const [user, businessProfile, userProfile] = await Promise.all([
        User.findById(userId).lean(),
        BusinessProfile.findOne({ ownerUserId:userId }).lean(),
        UserProfile.findOne({ userId:userId }).lean()
    ]);   
    
    // Validate
    if(!user) throw new ApiError(400, "Failed to fetch user on google login!");

    // Generate access & refresh tokens
    const accessToken = generateAccessToken({ 
        _id:user._id, 
        role:user.role, 
        profiles: {
            businessProfileId: businessProfile?._id || null,
            userProfileId: userProfile?._id || null
        }
    });
    const refreshToken = generateRefreshToken({ _id:user._id });

    // Validate
    if(!accessToken) throw new ApiError(400, "Failed to generate access token");
    if(!refreshToken) throw new ApiError(400, "Failed to generate refresh token");

    // Redirect to application
    return response.status(303)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .redirect(`${process.env.FRONTEND_URL}/authSuccess`);
}

// User existence
const userExistence = asyncHandler(async (request, response) => {
    const { userId } = request.body || {};

    // Validate ID
    if(!userId) throw new ApiError(400, "User ID is missing");
    if(!isValidObjectId(userId)) throw new ApiError(400, "Invalid MongoDB ID");

    // Find user
    const user = await User.findById(userId).select("_id").lean();
    if(!user) throw new ApiError(404, "User not found!");

    // Response
    return response.status(200).json(new ApiResponse(200, user._id, "User exists"));
});

// User auth check
const userAuthCheck = asyncHandler(async (request, response) => {
    const { _id:userId, role } = request.user;

    // Response
    return response.status(200).json(new ApiResponse(200, { userId, role }, "Authenticated!"));
});

module.exports = { userSignup, userLogin, logout, refreshAccessToken, switchRole, forgotPassword, 
resendOTPToken, verifyOTP, verifypasswordResetToken, resetPassword, googleLogin, userExistence,
userAuthCheck };