const { Router } = require("express");
const { authentication, authorization } = require("../middlewares/auth");
const { fetchMyProducts, topPerformingProducts, updateMapURL, viewBusinessProfile, 
fetchViewCounts, updateContactInfo, fetchLowStockProducts,fetchRecentJobApplications,
fetchNewLeads, countTotalJobApplications, countTotalHiredApplicants, countTotalInterviewApplicants,
countConversionRate, fetchInStockProducts, fetchOutOfStockProducts,
countTotalJobViews,
fetchMyJobs} = require("../controllers/businessProfileManagementController");
const { checkSubscription, checkBusinessAccess } = require("../middlewares/checkSubscription");

// Router instance
const businessProfileManagementRouter = Router();

// Fetch my products
businessProfileManagementRouter.route("/my-products")
.get(authentication, authorization(["business"]), fetchMyProducts);

// Fetch in-stock products
businessProfileManagementRouter.route("/in-stock-products")
.get(authentication, authorization(["business"]), checkSubscription, fetchInStockProducts);

// Fetch low-stock products
businessProfileManagementRouter.route("/low-stock-products")
.get(authentication, authorization(["business"]), fetchLowStockProducts);

// Fetch out-of-stock products
businessProfileManagementRouter.route("/out-of-stock-products")
.get(authentication, authorization(["business"]), fetchOutOfStockProducts);

// Fetch top performing products
businessProfileManagementRouter.route("/top-performing-products")
.get(authentication, authorization(["business"]), topPerformingProducts);

// Update map URL
businessProfileManagementRouter.route("/map-url")
.patch(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, updateMapURL);

// View business profile
businessProfileManagementRouter.route("/view/:businessProfileId")
.get(authentication, authorization(["user", "business"]), viewBusinessProfile);

// Fetch view counts
businessProfileManagementRouter.route("/view-counts")
.get(authentication, authorization(["business"]), fetchViewCounts);

// Update contact information
businessProfileManagementRouter.route("/contact-info")
.patch(authentication, authorization(["business"]), checkSubscription, checkBusinessAccess, updateContactInfo);

// Fetch recent job applicants
businessProfileManagementRouter.route("/recent-job-applicants")
.get(authentication, authorization(["business"]), fetchRecentJobApplications);

// Fetch new leads
businessProfileManagementRouter.route("/new-leads")
.get(authentication, authorization(["business"]), fetchNewLeads);

// Fetch my jobs (All jobs posted by this business)
businessProfileManagementRouter.route("/my-jobs")
.get(authentication, authorization(["business"]), fetchMyJobs);

// Count total views on job
businessProfileManagementRouter.route("/count-job-views")
.get(authentication, authorization(["business"]), countTotalJobViews);

// Count total job applications
businessProfileManagementRouter.route("/count-job-applications")
.get(authentication, authorization(["business"]), countTotalJobApplications);

// Count total hired applicants
businessProfileManagementRouter.route("/count-hired-applicants")
.get(authentication, authorization(["business"]), countTotalHiredApplicants);

// Count total interview applicants
businessProfileManagementRouter.route("/count-interview-applicants")
.get(authentication, authorization(["business"]), countTotalInterviewApplicants);

// Count conversion rate
businessProfileManagementRouter.route("/count-conversion-rate")
.get(authentication, authorization(["business"]), countConversionRate);

module.exports = businessProfileManagementRouter;