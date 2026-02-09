const { Router } = require("express");
const { createReviewInvite, createTestimonial, fetchTestimonials, 
viewTestimonial, flagTestimonial } = require("../controllers/testimonialController");
const { authentication, authorization } = require("../middlewares/auth");

// Router insatnce
const testimonialRouter = Router();

// All routes require authentication
testimonialRouter.use(authentication);

// Create review invite
testimonialRouter.route("/invite")
.get(authorization(["business"]), createReviewInvite);

// Create testimonials
testimonialRouter.route("/:inviteToken")
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

module.exports = testimonialRouter;