const { Schema, model, trusted } = require("mongoose");
const paginate = require("mongoose-paginate-v2");

// Schema
const productSchema = new Schema({
    businessId: { type: Schema.Types.ObjectId, ref: "BusinessProfile" },
    title: { type:String, required:true },
    image: { type:String, required:true },
    detail: { type:String, required:true },
    category: { type:String, required:true },
    pricePerUnit: { type:Number, required:true },
    tieredPricing: { type:Map, of:Number }, // e.g. { "1-10": 10, "11-50": 9, "51+": 8 }
    minOrderQty: { type:Number, required:true, default:1 },
    stockQty: { type:Number, required:true, default:0 },
    lowStockThreshold: { type:Number, default:5 }, // For critical stock alert
    shippingMethod:{ type:String, required:true },
    shippingCost:{ type:Number, required:true, default:0 },
    estimatedDeliveryDays: { type:String, required:true },
    isFeatured: { type:Boolean, default:false },
    status: { type: String, enum:["pending", "approved", "rejected", "draft"], default: "pending" },
    isSingleProductAvailable: { type: Boolean, default:false }
}, { timestamps: true });

// Inject plugin
productSchema.plugin(paginate);

// Model
const Product = model("Product", productSchema);

module.exports = Product;