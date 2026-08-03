require("dotenv").config();
const http = require("http"); 
const { Server } = require("socket.io"); 
const app = require("./app");
const { port, corsOptions } = require("./constants");
const connectDB = require("./database/connection");
const socketAuthentication = require("./middlewares/socket");
const Chat = require("./models/chatsModel");
const ApiError = require("./utils/ApiError");
const generateConversationId = require("./utils/generateConversationId");
require("./cron/autoReleaseEscrow");
require("./workers/emailWorker");
require("./workers/adminEmailWorker");

// Create Http server 
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, { cors:corsOptions, cookie:true });

// Make io accessible to our app
app.set("io", io);

// Socket authentication middleware
io.use(socketAuthentication);

// Socket.io connection handling
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Get user payload from socket
    const { user } = socket;

    // Join private rooms
    if(user) 
    {
        // Join parent user private room
        socket.join(String(socket.user._id));
        console.log(`User joined private room: ${String(socket.user._id)}`);

        const { businessProfileId, userProfileId } = user.profiles || {};

        // Join business profile room if they exist
        if(businessProfileId)
        {
            socket.join(String(businessProfileId));
            console.log(`User joined business profile room: ${businessProfileId}`);
        }

        // Join user profile room if it exists
        if(userProfileId)
        {
            socket.join(String(userProfileId));
            console.log(`User joined user profile room: ${userProfileId}`);
        }
    }

    // Join community room
    socket.on("join_community", (communityId) => {
        socket.join(`community:${communityId}`);
        console.log(`User joined community room: ${communityId}`);
    });

    // Disonnect event
    socket.on("disconnect", () => {
        console.log("User disconnected");
    });

    // Read message
    socket.on("read-message", async ({ messageId, senderId, receiverId }) => {
        try 
        {
            // Mark as read in db
            const message = await Chat.findByIdAndUpdate(messageId, { isRead:true });
            if(!message) throw new ApiError(404, "Message not found! Failed to read");

            console.log("Marking message as read on server.", messageId);
            
            // Emit read message
            io.to(senderId).emit("read-message", { isRead:true });
            io.to(receiverId).emit("read-message", { isRead:true });
        } 
        catch(error) 
        {
            throw error;
        }
    });

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

// Connect db
connectDB()
.then(() => {
    server.on("error", () => console.log("Failed to listen"));
    server.listen(port, "0.0.0.0", () => console.log(`Server is up and running on port ${port}`));
})
.catch(error => console.log("Failed to connect with database", error.message));