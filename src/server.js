require("dotenv").config();
const http = require("http"); 
const { Server } = require("socket.io"); 
const app = require("./app");
const { port, corsOptions } = require("./constants");
const connectDB = require("./database/connection");
const socketAuthentication = require("./middlewares/socket");
const connectSocket = require("./validations/connectSocket");
require("./cron/autoReleaseEscrow");
require("./cron/subscriptionAutoExpire");
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

// Socket connection
connectSocket(io);

// Connect db
connectDB()
.then(() => {
    server.on("error", () => console.log("Failed to listen"));
    server.listen(port, "0.0.0.0", () => console.log(`Server is up and running on port ${port}`));
})
.catch(error => console.log("Failed to connect with database", error.message));