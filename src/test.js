const { io } = require("socket.io-client");

// Access token
const TOKEN = "";

// Frontend socket configuration
const socket = io("http://localhost:8000", {
    withCredentials: true,
    // autoConnect:false,
    auth: { authToken:TOKEN },
    transports:["websocket"]
});

// Connect
socket.on("connect", () => {
    console.log("Connected to server");
    console.log("Socket ID:", socket.id);
});

// Connection error
socket.on("connect_error", (err) => console.log("Connection Error:", err.message));

// Disconnect
socket.on("disconnect", () => console.log("Disconnected from server"));

// Listen for notification
// socket.on("notification", (data) => console.log("Notification recieved", data));

// Seen message functionality
// const messageId = '698ae6250f47b8d6ca276784';
// const senderId = '698058aab04c746c04d0d61d';
// const receiverId = '69805851b04c746c04d0d589';

// // Emit once read the message
// socket.emit("read-message", ({ messageId, senderId, receiverId }));

// // Listen-back for read message
// socket.on("read-message", ({ isRead }) => console.log("Client received read flag from server:", isRead));

// Listen for messages
// socket.on("message", (data) => console.log("Message recieved", data));