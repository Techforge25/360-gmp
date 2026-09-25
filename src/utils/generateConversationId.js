const generateConversationId = (senderId, receiverId) => {
    return [String(senderId), String(receiverId)].sort().join("-");
};

module.exports = generateConversationId;