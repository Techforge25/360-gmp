const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Schema
const communitySchema = new Schema({
    // Basic info
    businessId: { type:Schema.Types.ObjectId, ref: "BusinessProfile", required:true },
    name: { type:String, required:true, trim:true },
    category: { type:String, trim:true },
    type: { type:String, enum: ["public", "private", "featured"], default: "public", required:true },
    description: { type:String, trim:true },
    purpose: { type:String, trim:true },
    industry:{ type:String, trim:true },
    region:{ type:String },
    tags: { type: [String], default:[] },
    rules: { type: String, trim: true },

    // Media settings
    coverImage: { type:String, default:null },
    profileImage: { type:String, default:null },
    bannerTagLine: { type:String, trim:true, default:null },
    colorHashcode:{ type:String, trim:true, default:null },

    // Security
    status: { type: String, enum: ["active", "inactive", "suspended"], default: "active" },
    postingPermissions: { type:String, default:"all-members", enum:["all-members", "moderators-only", "admins-only"] },
    memberCount: { type:Number, default: 0 }
}, { timestamps: true });

// Inject plugin
communitySchema.plugin(paginate);
communitySchema.plugin(aggregatePaginate);

// Indexes
communitySchema.index({ businessId: 1 });
communitySchema.index({ type: 1 });
communitySchema.index({ status: 1 });

// Model
const Community = model("Community", communitySchema);

module.exports = Community;