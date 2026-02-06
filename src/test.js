const { io } = require("socket.io-client");

// Access token
const TOKEN = "Access Token";

// Frontend socket configuration
const socket = io("http://localhost:8000", {
    withCredentials: true,
    autoConnect:false,
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
socket.on("notification", (data) => console.log("Notification recieved", data));