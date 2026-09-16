const getMemberIdAndModel = (userPayload) => {
    try
    {
        if(!userPayload) return null;
        const { userProfileId, businessProfileId } = userPayload.profiles || {};
        const { role } = userPayload;

        // Set dynamic member id and model
        const memberId = role === "user" ? userProfileId : businessProfileId;
        const memberModel = role === "user" ? "UserProfile" : "BusinessProfile";

        return { memberId, memberModel };
    }
    catch(error)
    {
        console.log(`Failed to get member info ${error.message}`);
        return null;
    }
};

module.exports = getMemberIdAndModel;