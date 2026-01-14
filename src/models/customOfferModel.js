const { Schema, model } = require("mongoose");

// Schema
const customOfferSchema = new Schema({
    sellerBusinessProfileId: { type:Schema.Types.ObjectId, ref:"BusinessProfile", required:[true, "Seller business profile ID is required"] },
    buyerUserProfileId: { type:Schema.Types.ObjectId, ref:"UserProfile", required:[true, "Buyer user profile ID is required"] },
    productId: { type:Schema.Types.ObjectId, ref:"Product", required:[true, "Product ID is required"] },
    quantity: { type:Number, required:[true, "Quantity is required"] },
    pricePerUnit: { type:Number, required:[true, "Price per unit is required"] },
    subTotal: { type:Number, required:[true, "Subtotal is required"] },
    shippingCost: { type:Number, required:[true, "Shipping cost is required"] },
    shippingMethod:{ type:String, required:[true, "Shipping method is required"] },
    estimatedDelivery:{ type:String, required:[true, "Estimated delivery is required"] },
    noteToBuyer:{ type:String },
    status: { type:String, default:"pending", enum:["pending", "accepted", "rejected"] }
}, { timestamps:true });

// Model
const CustomOffer = model("CustomOffer", customOfferSchema);

module.exports = CustomOffer;