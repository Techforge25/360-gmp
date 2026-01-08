const generateConversationId = (senderId, receiverId) => {
    return [senderId.toString(), receiverId.toString()].sort().join("-");
};

module.exports = generateConversationId;