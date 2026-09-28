const generateConversationId = (senderId, recipientId) => {
    return [String(senderId), String(recipientId)].sort().join("-");
};

module.exports = generateConversationId;