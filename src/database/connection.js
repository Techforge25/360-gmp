const mongoose = require("mongoose");

const connectDB = async () => {
    try
    {
        const response = await mongoose.connect(process.env.MONGO_URL);
        console.log(`Database connected with ${response.connection.host}`);
    }
    catch(error)
    {
        console.log("Failed to connect with database", error.message);
        process.exit(1);
    }
};

module.exports = connectDB;