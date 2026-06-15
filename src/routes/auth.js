const { Router } = require("express");
const { userSignup, userLogin, logout, switchRole, forgotPassword, 
verifypasswordResetToken, resetPassword, googleLogin, verifyOTP, 
resendOTPToken, userExistence, refreshAccessToken, userAuthCheck } = require("../controllers/auth");
const { authentication } = require("../middlewares/auth");
const passport = require("passport");
const { checkSubscription } = require("../middlewares/checkSubscription");
const limitRequest = require("../middlewares/rateLimit");

// Router instance
const authRouter = Router();

// User signup
authRouter.route("/user/signup").post(userSignup);

// Resend OTP token
authRouter.route("/user/resend-otp")
.post(limitRequest({ minutes:1, maxRequests:1, message:"Please wait 1 minute for next otp request" }), resendOTPToken);

// Account activation
authRouter.route("/user/verify-otp").post(verifyOTP);

// User login
authRouter.route("/user/login").post(userLogin);

// User existence
authRouter.route("/user/existence").post(userExistence);

// User auth check
authRouter.route("/user/me").get(authentication, checkSubscription, userAuthCheck);

// Logout
authRouter.route("/logout").get(authentication, logout);

// Refresh token
authRouter.route("/refreshToken").get(refreshAccessToken);

// Refresh token - (Switch user role)
authRouter.route("/refreshToken/updateRole").get(authentication, checkSubscription, switchRole);

// Forgot password
authRouter.route("/forgotPassword").post(forgotPassword);

// Password reset token verification
authRouter.route("/verifyPasswordResetToken").post(verifypasswordResetToken);

// Reset password
authRouter.route("/resetPassword/:passwordResetToken").post(resetPassword);

// Login as google
authRouter.route('/google').get(passport.authenticate('google', { scope:['profile', 'email'], prompt:"select_account" }));
authRouter.route('/google/callback').get(passport.authenticate('google', { session:false, 
failureRedirect: `${process.env.FRONTEND_URL}/login`, 
}), googleLogin);

module.exports = authRouter;