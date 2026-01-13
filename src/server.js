require("dotenv").config();
const http = require("http"); 
const { Server } = require("socket.io"); 
const app = require("./app");
const { port, corsOptions } = require("./constants");
const connectDB = require("./database/connection");

//create Http server 
const server = http.createServer(app);

const io =  new Server(server,{
    cors: corsOptions
})
app.set("io", io);

io.on("connection",(socket)=>{
    console.log("A user connected:", socket.id);
    socket.on("join_community", (communityId) => {
        socket.join(communityId);
        console.log(`User joined community room: ${communityId}`);
    });

    socket.on("disconnect", () => {
        console.log("User disconnected");
    });
})

// Connect db
connectDB()
.then(() => {
    app.on("error", () => console.log("Failed to listen"));
    //app.listen(port, () => console.log(`Server is up and running`));
    server.listen(port, () => console.log(`Server is up and running on port ${port}`));
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