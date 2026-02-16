require("dotenv").config();
const http = require("http"); 
const { Server } = require("socket.io"); 
const app = require("./app");
const { port, corsOptions } = require("./constants");
const connectDB = require("./database/connection");
const socketAuthentication = require("./middlewares/socket");
const Chat = require("./models/chatsModel");
const ApiError = require("./utils/ApiError");

// Create Http server 
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server, { cors:corsOptions });

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
        socket.join(`user:${socket.user._id}`);
        console.log(`User joined private room: ${socket.user._id}`);

        const { businessProfileId, userProfileId } = user.profiles || {};

        // Join business profile room if they exist
        if(businessProfileId)
        {
            socket.join(businessProfileId); // Without prefix
            socket.join(`businessProfile:${businessProfileId}`);
            console.log(`User joined business profile room: ${businessProfileId}`);
        }

        // Join user profile room if it exists
        if(userProfileId)
        {
            socket.join(userProfileId); // Without prefix
            socket.join(`userProfile:${userProfileId}`);
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
});

// Connect db
connectDB()
.then(() => {
    server.on("error", () => console.log("Failed to listen"));
    server.listen(port, "0.0.0.0", () => console.log(`Server is up and running on port ${port}`));
})
.catch(error => console.log("Failed to connect with database", error.message));


///Frontend for testing 
/*
import { io } from "socket.io-client";
const socket = io("http://localhost:8000");

// Jab user kisi community page par jaye
useEffect(() => {
    socket.emit("join_community", communityId);

    // Nayi post ka intezar karein
    socket.on("new_post", (newPost) => {
        setPosts((prev) => [newPost, ...prev]); // State update karein
    });

    // Like ya Comment update sun-ne ke liye
    socket.on("post_updated", (data) => {
        // Find post by ID and update its likes in UI
    });

    return () => socket.off("new_post"); // Cleanup
}, [communityId])*/