require("dotenv").config();
const app = require("./app");
const { port } = require("./constants");
const connectDB = require("./database/connection");

// Connect db
connectDB()
.then(() => {
    app.on("error", () => console.log("Failed to listen"));
    app.listen(port, () => console.log(`Server is up and running`));
})
.catch(error => console.log("Failed to connect with database", error.message));