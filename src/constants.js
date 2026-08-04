// Port and environment
const port = process.env.PORT || 8000;
const isProduction = process.env.NODE_ENV === "production";
const isStaging = process.env.NODE_ENV === "staging";
const isLocal = process.env.NODE_ENV === "local";


// Dynamic frontend url based on node environemnt
let frontendURL = null;
let adminFrontendURL = null;

// Production
if(isProduction)
{
    frontendURL = "https://360-gmp-front-end.vercel.app";
    adminFrontendURL = null;
}

// Staging
if(isStaging)
{
    frontendURL = "https://360-gmp-front-end-git-staging-aftabs-projects-80f407ba.vercel.app";
    adminFrontendURL = "https://360-gmp-frontend-superadmin-64bl3oj4h-aftabs-projects-80f407ba.vercel.app";
}

// Local
if(isLocal)
{
    frontendURL = "http://localhost:3000";
    adminFrontendURL = "http://localhost:3000";
}

// Super admin unique ID
const superAdminId = String(process.env.SUPER_ADMIN_ID);

// Cors options
const corsOptions = {
    origin:[
        frontendURL, 
        process.env.FRONTEND_URL, 
        "http://localhost:3000", 
        "https://360-gmp-frontend-superadmin-64bl3oj4h-aftabs-projects-80f407ba.vercel.app", 
        "https://360-gmp-frontend-superadmin-staging.vercel.app"
    ],
    credentials:true,
    methods:["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders:["Content-Type", "Authorization"]
};

// Cookie options
const cookieOptions = {
    httpOnly: true,
    secure: isLocal ? false : true,
    signed: true,
    maxAge: 1000 * 60 * 60 * 24 * 90,
    sameSite: isLocal ? "lax" : "none",
    domain: isProduction ? ".techforgeinnovations.com" : undefined
};

// Empty list
const emptyList = { 
    docs:[], 
    totalPages:0, 
    totalDocs:0, 
    limit:0, 
    page:0, 
    pagingCounter:0, 
    hasPrevPage:false, 
    hasNextPage:false, 
    prevPage:null, 
    nextPage:null 
};

// Notification types
const allowedNotificationTypes = ["System", "UserProfile", "BusinessProfile"];

// Allowed incoterms enum
const allowedIncoterms = ["EXW - Ex Works", "FCA - Free Carrier", "FAS - Free Alongside Ship", "FOB - Free On Board",
"CFR - Cost and Freight", "CIF - Cost, Insurance, Freight", "CPT - Carriage Paid To", "CIP - Carriage and Insurance Paid To",
"DAP - Delivered At Place","DPU - Delivered At Place Unloaded", "DDP - Delivered Duty Paid"];

// Allowed terms and capability enum
const allowedTermsAndCapability = ['Air Freight', 'Sea Freight', 'Express Courier', 'Rail Freight', 'Road Transport'];

// Allowed plan names
const allowedPlanNames = ["Consumer / Individual", "Sneak Peek Free – 14 Days", "Silver", "Bronze", "Enterprise", "Gold"];

module.exports = {
    port,
    isProduction,
    isStaging,
    isLocal,
    frontendURL,
    adminFrontendURL,
    superAdminId,
    corsOptions,
    cookieOptions,
    emptyList,
    allowedNotificationTypes,
    allowedIncoterms,
    allowedTermsAndCapability,
    allowedPlanNames
};