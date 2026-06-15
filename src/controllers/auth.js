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
const validate = require("../utils/validate");
const forgotPasswordSchema = require("../validations/forgotPasswordValidator");
const resetPasswordSchema = require("../validations/resetPasswordValidator");
const { userSignupValidator, userLoginValidator, verifyOtpValidator, resendOtpValidator } = require("../validations/user");
const verifyPasswordResetTokenSchema = require("../validations/verifyPasswordResetTokenValidator");
const sendNotification = require("../utils/sendNotification");
const Subscription = require("../models/subscription");
const { setCache, getCache, deleteCache } = require("../redis/redisHelpers");
const { getOTPKey, getResetPasswordKey } = require("../utils/redisKeys");
const emailQueue = require("../queues/emailQueue");
const { redis } = require("../redis/connection");

// User signup
const userSignup = asyncHandler(async (request, response) => {
    // Validate
    const { email, passwordHash } = validate(userSignupValidator, request.body) || {};

    // Check if email exist
    const user = await User.findOne({ email }).select("_id email status").lean();
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
    const createdUser = await User.create({ email, passwordHash, role: null });
    if(!createdUser) throw new ApiError(500, "Unable to signup");  
    
    // Store in redis
    await setCache(getOTPKey(email), accountVerificationToken);    

    // Send email in backgrouund
    await emailQueue.add("sendOTPEmail", { email, accountVerificationToken });

    // Response
    return response.status(200).json(new ApiResponse(200, createdUser._id, "Signup successful! We have sent you an OTP to your email"));     
});

// Resend OTP token for account verification
const resendOTPToken = asyncHandler(async (request, response) => {
    const { email } = validate(resendOtpValidator, request.body) || {};

    // Find user
    const user = await User.findOne({ email });
    if(!user) throw new ApiError(404, "User not found associated with this email");
    if(user.status !== "pending") throw new ApiError(400, "Your account is already activated");

    // Check exisiting otp
    const exist = await getCache(getOTPKey(email));
    if(exist) throw new ApiError(400, "Please wait until your current OTP expires before requesting a new one");

    // Generate new OTP token
    const { code:accountVerificationToken } = generateCode(6);
    if(!accountVerificationToken) throw new ApiError(500, "Failed to generate OTP");

    // Store OTP in redis
    await setCache(getOTPKey(email), accountVerificationToken);

    // Send email in backgrouund
    await emailQueue.add("sendOTPEmail", { email, accountVerificationToken }); 

    // Response
    return response.status(200).json(new ApiResponse(200, user._id, "We have re-sent you an OTP to your email"));         
});

// Verify OTP
const verifyOTP = asyncHandler(async (request, response) => {
    const { userId, accountVerificationToken } = validate(verifyOtpValidator, request.body) || {};

    // Validate
    if(!isValidObjectId(userId)) throw new ApiError(400, "User ID is not a valid MongoDB ID");

    // Find user
    const user = await User.findById(userId);
    if(!user) throw new ApiError(404, "User not found!");

    // Get OTP from redis
    const otp = await getCache(getOTPKey(user.email));

    // Validate
    if(!otp) throw new ApiError(400, "Invalid or expired OTP");
    if(otp !== accountVerificationToken) throw new ApiError(400, "Invalid OTP");

    // Save to db
    user.status = "active";
    await user.save();

    // Delete from redis
    await deleteCache(getOTPKey(user.email));

    // Send notification to parent user upon account creation
    await sendNotification({ 
        userId,
        type: "System",
        title: "Welcome aboard!",
        content: "Your account is now verified and ready to use.",
        io: request.app.get("io")
    });   

    // Response
    return response.status(200).json(new ApiResponse(200, user.email, "Your account has been activated"));
});

// User login
const userLogin = asyncHandler(async (request, response) => {
    const { email, passwordHash } = validate(userLoginValidator, request.body) || {};

    // Get IP (IPv4)
    const ip = request.headers["x-real-ip"];
    const key = `invalidCredetialsAttempts:${ip}`;

    // Check total attempts
    const totalAttempts = await getCache(key);
    if(totalAttempts === 5) throw new ApiError(429, "Too many failed login attempts. Please try again later.");

    // Find user
    const user = await User.findOne({ email });
    if(!user) 
    {
        const attempts = await redis.incr(key);

        // Set expiry only on first failed attempt
        if(attempts === 1) await redis.expire(key, 60 * 5); // 5 minutes
        throw new ApiError(400, "Invalid email or password");
    }

    // Match password
    const isMatched = await user.matchPassword(passwordHash);
    if(!isMatched)
    {
        const attempts = await redis.incr(key);

        // Set expiry only on first failed attempt
        if(attempts === 1) await redis.expire(key, 60 * 5); // 5 minutes
        throw new ApiError(400, "Invalid email or password");
    }

    // Only approved account can log in
    if(user.status === "pending") return response.status(200).json(new ApiResponse(200, { otpRequired: true }, "Please verify your identity via OTP."));
    if(user.status === "flagged") throw new ApiError(400, "Your account is flagged. You cannot log-in to your account");  
    
    // Find profiles
    const [userProfile, businessProfile] = await Promise.all([
        UserProfile.findOne({ userId: user._id }),
        BusinessProfile.findOne({ ownerUserId: user._id }),
    ]);

    // Generate access token & refresh tokens
    const accessToken = generateAccessToken({ 
        _id: user._id, 
        role: user.role, 
        profiles: {
            userProfileId: userProfile?._id || null,
            businessProfileId: businessProfile?._id || null,
        }
    });
    const refreshToken = generateRefreshToken({ _id: user._id });

    // Validate
    if(!accessToken) throw new ApiError(500, "Failed to generate access token");
    if(!refreshToken) throw new ApiError(500, "Failed to generate refresh token");

    // Save to db
    user.refreshToken = refreshToken;
    await user.save();

    // Is new user flag
    const isNewUser = Boolean(!user.role);

    // Delete attempts
    await deleteCache(key);

    // Conditional redirection
    const role = user.role;
    let redirectURL;

    // Find subscription
    const subscription = await Subscription.findOne({ userId: user._id, status: "active" }).populate("planId");
    if(!subscription)
    {
        redirectURL = `http://localhost:3000/onboarding/plans`;
        return response.status(200).json(new ApiResponse(200, { redirectURL }, "Subscription required"));
    }
    
    // Check expiry
    const currentDate = new Date();
    if(new Date(subscription.endDate) < currentDate)
    {
        subscription.status = "expired";
        await subscription.save();
        redirectURL = `http://localhost:3000/onboarding/plans`;
        return response.status(200).json(new ApiResponse(200, { redirectURL }, "Subscription has been expired! Please renew"));
    }

    // Role based redirection
    if(!role)
    {
        redirectURL = `http://localhost:3000/onboarding/role`;
    }
    else
    {
        redirectURL = `http://localhost:3000/dashboard/${role}`;
    }    

    // Response
    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(new ApiResponse(200, { role, isNewToPlatform:isNewUser, accessToken, refreshToken, redirectURL }, "Login successful"));
});

// Logout
const logout = asyncHandler(async (request, response) => {
    const userId = request.user._id;

    // Clear refresh token from db
    const user = await User.findByIdAndUpdate(userId, { $set:{ refreshToken:null } });
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
    .json(new ApiResponse(200, { accessToken, refreshToken }, "Refresh token has been issued"));
});

// Switch role
const switchRole = asyncHandler(async (request, response) => {
    const userId = request.user._id;
    const { role = null } = request.query;

    // Validate
    if(!role) throw new ApiError(400, "Role is required for switching a profile");
    if(!["user", "business"].includes(role.toLowerCase())) throw new ApiError(400, "Invalid role. Role must be either 'user' or 'business'");

    // Check if user profile actually exist before switching
    if(role.toLowerCase() === "user")
    {
        const userProfile = await getUserProfile(userId);
        if(!userProfile) 
        {
            const redirectURL = `${process.env.FRONTEND_URL}/onboarding/user-profile`;
            return response.status(200).json(new ApiResponse(200, { redirectURL }, "Onboarding required for user profile"));
        }
    }

    // Check if business profile actually exist before switching
    if(role.toLowerCase() === "business")
    {
        const businessProfile = await getBusinessProfile(userId);
        if(!businessProfile)
        {
            const redirectURL = `${process.env.FRONTEND_URL}/onboarding/business-profile`;
            return response.status(200).json(new ApiResponse(200, { redirectURL }, "Onboarding required for business profile"));            
        }
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

    // Redirect URL
    // const redirectURL = `${process.env.FRONTEND_URL}/dashboard/${role}`;
    const redirectURL = `http://localhost:3000/dashboard/${role}`;

    // Response
    return response.status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .json(new ApiResponse(200, { profilePayload, accessToken, redirectURL }, `Role has changed to ${role}`));
});

// Forgot password
const forgotPassword = asyncHandler(async (request, response) => {
    const { email } = validate(forgotPasswordSchema, request.body) || {};

    // Check attempts
    const key = `forgotPasswordEmailAttempts:${email}`;
    const totalAttempts = await getCache(key);
    if(totalAttempts >= 1) throw new ApiError(400, "Please wait 5 minutes for next password reset request");

    // Find user
    const user = await User.findOne({ email });
    if(!user) throw new ApiError(404, "User not found associated with this email");

    // Generate a reset token
    const { code:resetToken } = generateCode(6);
    if(!resetToken) throw new ApiError(500, "Failed to generate password reset token");

    // Store token in redis
    await setCache(getResetPasswordKey(email), resetToken, 5);

    // Track attempts
    const attempts = await redis.incr(key);
    if(attempts === 1) await redis.expire(key, 60 * 5); // 5 minutes

    // Send email in backgrouund
    await emailQueue.add("sendResetPasswordEmail", { email, resetToken });

    // Response
    return response.status(200).json(new ApiResponse(200, null, "Password reset token has been sent to your email"));
});

// Verify password reset token
const verifypasswordResetToken = asyncHandler(async (request, response) => {
    const { email, passwordResetToken } = validate(verifyPasswordResetTokenSchema, request.body) || {};

    // Get token from redis
    const resetToken = await getCache(getResetPasswordKey(email));

    // Validate
    if(!resetToken) throw new ApiError(400, "Invalid or expired OTP");
    if(resetToken !== passwordResetToken) throw new ApiError(400, "Invalid OTP");

    // Response
    return response.status(200).json(new ApiResponse(200, passwordResetToken, "OTP verified successfully"));
});

// Reset password
const resetPassword = asyncHandler(async (request, response) => {
    const { email, newPassword } = validate(resetPasswordSchema, request.body) || {};
    const { passwordResetToken } = request.params;

    // Get token from redis
    const resetToken = await getCache(getResetPasswordKey(email));

    // Validate
    if(!resetToken) throw new ApiError(400, "Invalid or expired reset token");
    if(resetToken !== passwordResetToken) throw new ApiError(400, "Invalid reset token");    

    // Find user associated with this email
    const user = await User.findOne({ email }).select("_id passwordHash");
    if(!user) throw new ApiError(404, "User not found");

    // Prevent restting password as old password
    const matchPassword = await user.matchPassword(newPassword);
    if(matchPassword) throw new ApiError(400, "Your new password cannot be the same as your previous password");

    // Update password
    user.passwordHash = newPassword;
    await user.save();

    // Delete cache from redis
    await deleteCache(getResetPasswordKey(email));

    // Time
    const time = new Date().toLocaleString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true
    })

    // Send notification to parent
    await sendNotification({
        userId: user._id,
        type: "System",
        title: "Security Alert",
        content: `Your password has reset at ${time}`,
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
    const { _id:userId, role, profiles } = request.user;
    const { userProfileId = null, businessProfileId = null } = profiles || {};  

    // Response
    return response.status(200).json(new ApiResponse(200, { userId, role, userProfileId, businessProfileId }, "Authenticated!"));
});

module.exports = { userSignup, userLogin, logout, refreshAccessToken, switchRole, forgotPassword, 
resendOTPToken, verifyOTP, verifypasswordResetToken, resetPassword, googleLogin, userExistence,
userAuthCheck };