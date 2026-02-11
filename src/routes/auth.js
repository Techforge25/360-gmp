const { Router } = require("express");
const { userSignup, userLogin, logout, refreshToken, forgotPassword, verifypasswordResetToken, resetPassword, googleLogin, verifyOTP, resendOTPToken } = require("../controllers/auth");
const { authentication } = require("../middlewares/auth");
const passport = require("passport");

// Router instance
const authRouter = Router();

// User signup
authRouter.route("/user/signup").post(userSignup);

// Resend OTP token
authRouter.route("/user/resend-otp").post(resendOTPToken);

// Account activation
authRouter.route("/user/verify-otp").post(verifyOTP);

// User login
authRouter.route("/user/login").post(userLogin);

// Logout
authRouter.route("/logout").get(logout);

// Refresh token - (update user role)
authRouter.route("/refreshToken/updateRole").get(authentication, refreshToken);

// Forgot password
authRouter.route("/forgotPassword").post(forgotPassword);

// Password reset token verification
authRouter.route("/verifyPasswordResetToken").post(verifypasswordResetToken);

// Reset password
authRouter.route("/resetPassword/:passwordResetToken").post(resetPassword);

// Login as google
authRouter.route('/google').get(passport.authenticate('google', { scope:['profile', 'email'], prompt:"select_account" }));
authRouter.route('/google/callback').get(passport.authenticate('google', { session:false }), googleLogin);

module.exports = authRouter;