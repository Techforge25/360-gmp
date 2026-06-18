const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/users');

// Google
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL,
}, 
async (accessToken, refreshToken, profile, done) => {
    try 
    {
        // Extract properties
        const gid = profile?.id;
        const email = profile?.emails?.[0]?.value;

        // If user already exist in database
        const existingUser = await User.findOne({ $or:[{ gid:gid }, { email:email }] });
        if(existingUser) return done(null, existingUser);
    
        // Create new user
        const createUser = await User.create({
            gid:gid,
            email:email,
            passwordHash:`${Date.now()}-GoogleLogin`,
            googleAccount: true
        });
        return done(null, createUser);
    } 
    catch(error) 
    {
        return done(error, null);
    }
}));