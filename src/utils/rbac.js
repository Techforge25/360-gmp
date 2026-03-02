const ApiError = require("./ApiError");

// Role based access control
const roles = {
    // Admin
    admin: {
        create: ['community', 'post', 'comment', 'plan'],
        fetch: ['community', 'post', 'comment', 'plan'],
        update: ['community', 'post', 'comment', 'plan'],
        delete: ['community', 'post', 'comment', 'plan']
    },

    // User profile
    user: {
        create: ['order', 'jobApplication'],
        fetch: ['order', 'jobApplication'],
        update: ['order', 'jobApplication'],
        delete: ['order', 'jobApplication']
    },

    // Business profile
    business: {
        create: ['job', 'product'],
        fetch: ['job', 'product', 'order', 'jobApplication'],
        update: ['job', 'product', 'order', 'jobApplication'],
        delete: ['job', 'product']
    }
};

// Allowed roles
const allowedRoles = ["admin", "user", "business"];
const allowedActions = ["create", "fetch", "update", "delete"];

// Allow access
const hasAccess = (role, action, entity) => {
    // Check role and actions
    if(!allowedRoles.includes(role)) throw new ApiError(400, "Invalid role");
    if(!allowedActions.includes(action)) throw new ApiError(400, "Invalid action");

    // Check access
    if(!roles[role][action].includes(entity)) return false;
    return true;
};

module.exports = { hasAccess };