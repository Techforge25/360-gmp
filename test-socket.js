const { io } = require("socket.io-client");

// Backend URL
const socket = io("http://localhost:8000");

const COMMUNITY_ID = "6961900db6030d7883061696";

socket.on("connect", () => {
    console.log("Connected to Server! ID:", socket.id);

    // Step 1: Room join karo
    socket.emit("join_community", COMMUNITY_ID);
    console.log(`Joined Room: ${COMMUNITY_ID}`);
});

// Step 2: Listeners set karo
socket.on("new_post", (data) => {
    console.log("🔥 REAL-TIME NEW POST RECEIVED:");
    console.log(data);
});

socket.on("post_updated", (data) => {
    console.log("👍 REAL-TIME LIKE/UPDATE RECEIVED:");
    console.log(data);
});

socket.on("new_comment", (data) => {
    console.log("💬 REAL-TIME NEW COMMENT RECEIVED:");
    console.log(data);
});