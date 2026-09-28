// Socket connection
function connectSocket(io)
{
    io.on("connection", (socket) => {
        socket.on("joinRoom", ({ profileId }) => {
            if(profileId)
            {
                socket.join(profileId);
                console.log(`Socket connected with Profile ID: ${profileId}`);
            }
            else
            {
                console.log(`Socket connected with Random ID: ${socket.id}`);
            }
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