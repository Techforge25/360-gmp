const { Schema, model } = require("mongoose");

// Schema
const customOfferSchema = new Schema({
    buyerBusinessProfileId: { type:Schema.Types.ObjectId, ref:"BusinessProfile", required:[true, "Buyer business profile ID is required"] },
    sellerUserId: { type:Schema.Types.ObjectId, ref:"UserProfile", required:[true, "Seller user profile ID is required"] },
    quantity: { type:Number, required:[true, "Quantity is required"] },
    pricePerUnit: { type:Number, required:[true, "Price per unit is required"] },
    subTotal: { type:Number, required:[true, "Subtotal is required"] },
    shippingCost: { type:Number, required:[true, "Shipping cost is required"] },
    method:{ type:String, required:[true, "Shipping method is required"] },
    estimatedDelivery:{ type:String, required:[true, "Estimated delivery is required"] },
    noteToBuyer:{ type:String },
    isAccepted: { type:Boolean, default:false }
});

// Model
const CustomOffer = model("CustomOffer", customOfferSchema);

module.exports = CustomOffer;