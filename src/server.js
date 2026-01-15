require("dotenv").config();
const http = require("http"); 
const { Server } = require("socket.io"); 
const app = require("./app");
const { port, corsOptions } = require("./constants");
const connectDB = require("./database/connection");
const socketAuthentication = require("./middlewares/socket");

// Create Http server 
const server = http.createServer(app);

// Socket.io setup
const io = new Server(server,{
    cors: corsOptions
});

// Make io accessible to our app
app.set("io", io);

// Share io instance with routes through request object
app.use((request, response, next) => {
    request.io = io;
    next();
});

// Socket authentication middleware
io.use(socketAuthentication);

// Socket.io connection handling
io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    // Join user private room
    const { user } = socket;
    if(user) 
    {
        // Join user private room
        socket.join(`user:${socket.user.id}`);
        console.log(`User joined private room: ${socket.user.id}`);
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