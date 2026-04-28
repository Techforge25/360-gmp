const { Router } = require("express");
const { createReviewInvite, createTestimonial, fetchTestimonials, 
viewTestimonial, flagTestimonial, deleteTestimonial, 
checkInviteToken} = require("../controllers/testimonialController");
const { authentication, authorization } = require("../middlewares/auth");
const { adminAuthentication, adminAuthorization } = require("../middlewares/adminAuth");

// Router insatnce
const testimonialRouter = Router();

// All routes require authentication
testimonialRouter.use(authentication);

// Create review invite
testimonialRouter.route("/invite")
.get(authorization(["business"]), createReviewInvite);

// Check invite token validity
testimonialRouter.route("/invite/:inviteToken/:businessId")
.get(authorization(["business", "user"]), checkInviteToken);

// Create testimonials
testimonialRouter.route("/:inviteToken/:businessId")
.post(authorization(["user"]), createTestimonial);

// Fetch testimonials for a business
testimonialRouter.route("/business/:businessId")
.get(authorization(["user", "business"]), fetchTestimonials);

// View single testimonial
testimonialRouter.route("/:testimonialId")
.get(authorization(["user", "business"]), viewTestimonial);

// Flag testimonial
testimonialRouter.route("/:testimonialId/flag")
.patch(authorization(["business"]), flagTestimonial);

// Delete testimonial
testimonialRouter.route("/:testimonialId")
.delete(adminAuthentication, adminAuthorization(["admin"]), deleteTestimonial);

module.exports = testimonialRouter;