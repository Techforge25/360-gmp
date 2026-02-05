const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { createUserProfile, fetchUserAnalytics, viewUserProfile, 
deleteUserProfile, updateUserProfileBasicInfo, updateUserProfileContactInfo,
updateUserProfileLogo, updateUserProfileResume, updateUserProfileEducation,
createWorkExperience, fetchWorkExperiences, updateWorkExperience, deleteWorkExperience,
fetchJobMatches, updateUserProfileJobPreferences, createUserSocialLink,
fetchUserSocialLinks,
updateUserSocialLink,
deleteUserSocialLink} = require("../controllers/userProfile");

// Router instance
const userProfileRouter = Router();

// Create user profile
userProfileRouter.route("/")
.post(authentication, createUserProfile);

// View user profile
userProfileRouter.route("/view")
.get(authentication, authorization(["user"]), viewUserProfile);

/* ======================= USER PROFILE UPDATES STARTS ======================= */
// Update basic info
userProfileRouter.route("/update/basic-info")
.patch(authentication, authorization(["user"]), updateUserProfileBasicInfo);

// Update contact info
userProfileRouter.route("/update/contact-info")
.patch(authentication, authorization(["user"]), updateUserProfileContactInfo);

// Update Profile logo
userProfileRouter.route("/update/logo")
.patch(authentication, authorization(["user"]), updateUserProfileLogo);

// Update resume
userProfileRouter.route("/update/resume")
.patch(authentication, authorization(["user"]), updateUserProfileResume);

// Update education
userProfileRouter.route("/update/education")
.patch(authentication, authorization(["user"]), updateUserProfileEducation);

// Update job preferences
userProfileRouter.route("/update/job-preferences")
.patch(authentication, authorization(["user"]), updateUserProfileJobPreferences);
/* ======================= USER PROFILE UPDATES ENDS ======================= */

// Delete user profile
userProfileRouter.route("/delete")
.get(authentication, authorization(["user"]), deleteUserProfile);

// Fetch user analytics
userProfileRouter.route("/analytics")
.get(authentication, authorization(["user"]), fetchUserAnalytics);

// Create work experience / Fetch work experiences
userProfileRouter.route("/work-experience")
.post(authentication, authorization(["user"]), createWorkExperience)
.get(authentication, authorization(["user"]), fetchWorkExperiences);

// Update work experience / Delete work experience
userProfileRouter.route("/work-experience/:workExperienceId")
.put(authentication, authorization(["user"]), updateWorkExperience)
.delete(authentication, authorization(["user"]), deleteWorkExperience);

// Fetch job matches (Job based on preferences)
userProfileRouter.route("/job-matches")
.get(authentication, authorization(["user"]), fetchJobMatches);

/* ======================= USER PROFILE SOCIAL LINK STARTS ======================= */
// Create social link / Fetch social links
userProfileRouter.route("/social")
.post(authentication, authorization(["user"]), createUserSocialLink)
.get(authentication, authorization(["user"]), fetchUserSocialLinks);

// Update social link
userProfileRouter.route("/social/:socialId")
.patch(authentication, authorization(["user"]), updateUserSocialLink)
.delete(authentication, authorization(["user"]), deleteUserSocialLink);
/* ======================= USER PROFILE SOCIAL LINK ENDS ======================= */

module.exports = userProfileRouter;