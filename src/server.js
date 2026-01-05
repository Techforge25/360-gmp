require("dotenv").config();
const app = require("./app");
const { port } = require("./constants");

require("dotenv").config();

// Connect db

// Start app
app.listen(port, () => console.log(`Server is up adn running`));