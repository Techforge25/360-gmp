const { Schema, model } = require("mongoose");
const paginate = require("mongoose-paginate-v2");
const aggregatePaginate = require("mongoose-aggregate-paginate-v2");

// Updated Schema
const orderSchema = new Schema({
    buyerUserProfileId: { type: Schema.Types.ObjectId, ref: "UserProfile", required:[true, "Buyer user profile ID is required"] },
    sellerBusinessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile", required:[true, "Seller business profile ID is required"] },
    totalAmount: { type: Number },
    status: { 
        type: String,
        enum: ["pending", "paid", "processing", "in-transit", "shipped", "delivered", "completed", "cancelled"],
        default: "pending" 
    },
    items: [{
        _id:false,
        productId: { type: Schema.Types.ObjectId, ref:"Product", required:[true, "Product ID is required"] },
        quantity: { type: Number, required:[true, "Please specify product quantity"] },
        priceAtPurchase: { type: Number, required:[true, "Please specify product price at purchase"] }
    }],

    // Shipping address info
    shippingAddress: {
        name: { type:String, trim:true, required:true },
        phone: { type:String, trim:true, required:true },
        lineAddress: [{ type:String, trim:true }],
        province: { type:String, trim:true, required:true },
        postalCode: { type:String, trim:true, required:true },
    },

    // Tracking info
    tracking: {
        trackingId: { type:String, default:null },
        courierName: { type:String, default:null },
        trackingUrl: { type:String, default:null },
        shippedAt: { type:Date },
        deliveredAt: { type:Date } // Delivered timestamp (For auto fund release after 14 days)
    },

    // Timestamp tracker upon order completion
    completedAt: { type:Date },

    // Order cancellation reasoning
    cancellationReason: { type:String, trim:true }
}, { timestamps: true });

// Inject plugin
orderSchema.plugin(paginate);
orderSchema.plugin(aggregatePaginate);

// Model
const Order = model("Order", orderSchema);

module.exports = Order;