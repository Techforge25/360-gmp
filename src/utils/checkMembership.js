const CommunityMembership = require("../models/communityMembership");

// Check community membership of a currently logged-in user
const checkMembership = async (communityId, memberId, memberModel) => {
    try
    {
        const membership = await CommunityMembership.findOne({ 
            communityId, 
            memberId, 
            memberModel, 
            status: "approved"
        });
        return membership ? membership : null;
    }
    catch(error)
    {
        return null;
    }
};

module.exports = checkMembership;