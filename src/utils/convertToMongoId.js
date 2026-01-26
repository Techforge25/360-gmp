const mongoose = require("mongoose");

const convertToMongoId = (id) => {
    return new mongoose.Types.ObjectId(String(id));
};

module.exports = convertToMongoId;