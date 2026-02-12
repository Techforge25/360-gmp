const { Schema, model } = require("mongoose");

// Schema
const callSchema = new Schema({
    callerProfileId: { type: Schema.Types.ObjectId, required:true },
    receiverProfileId: { type: Schema.Types.ObjectId, required:true },
    callType: { type: String, enum:["audio","video"] },
    status: { type: String, enum:["ringing","accepted","rejected","missed","ended"] },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date },
    duration: { type: Number } // Duration in seconds
}, { timestamps:true });

// Model
const Call = model("Call", callSchema);

module.exports = Call;