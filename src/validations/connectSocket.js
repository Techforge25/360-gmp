// Socket connection
function connectSocket(io)
{
    io.on("connection", (socket) => {
        console.log("Socket connected", socket.id);

        socket.on("joinRoom", ({ userId, userProfileId, businessProfileId }) => {
            if(userId) socket.join(userId);
            if(userProfileId) socket.join(userProfileId);
            if(businessProfileId) socket.join(businessProfileId);
        });

        // Disonnect event
        socket.on("disconnect", () => console.log("Socket disconnected"));

        /* Listen Start & Stop Typing For Private Chats */
        // Start - Private
        socket.on("private-typing:start", ({ senderId, senderName, receiverId }) => {
            const conversationId = generateConversationId(senderId, receiverId);
            socket.to(receiverId).emit("private-typing:start", { senderName, conversationId });
        });

        // Stop - Private
        socket.on("private-typing:stop", ({ senderId, senderName, receiverId }) => {
            const conversationId = generateConversationId(senderId, receiverId);
            socket.to(receiverId).emit("private-typing:stop", { senderName, conversationId });
        });    
    });
}

module.exports = connectSocket;